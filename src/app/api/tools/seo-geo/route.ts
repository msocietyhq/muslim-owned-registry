import { NextRequest } from "next/server";
import { allowance, listEligibleDomains, openSiteChat } from "@/lib/seo-geo/chat";
import { SEO_GEO_MESSAGES_PER_HOUR } from "@/lib/seo-geo/config";
import { errorResponse, json, requireUser } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const [domains, quota] = await Promise.all([
      listEligibleDomains(user.uid),
      allowance(user.uid, user.email),
    ]);
    return json({
      domains,
      limitPerHour: SEO_GEO_MESSAGES_PER_HOUR,
      remaining: quota.remaining,
      unlimited: quota.unlimited,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as { domain?: string };
    const result = await openSiteChat(user.uid, body.domain || "");
    if (!result.ok) return json({ error: result.error, domains: result.domains }, 400);
    return json({ chat: result.chat, queuePosition: result.queuePosition });
  } catch (error) {
    return errorResponse(error);
  }
}
