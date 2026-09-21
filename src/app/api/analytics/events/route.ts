import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, json } from "@/lib/http";
import { publishListingAnalytics, uniqueIds } from "@/lib/listing-analytics";
import { publishSiteVisit } from "@/lib/site-analytics";
import { parseVisitorId, VISITOR_COOKIE, visitorCookieOptions } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  kind: z.enum(["view", "impression", "visit"]),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
  businessIds: z.array(z.string()).max(80).optional(),
  slugs: z.array(z.string()).max(80).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = eventSchema.parse(await request.json());
    const visitorId =
      parseVisitorId(body.visitorId) ||
      parseVisitorId(request.cookies.get(VISITOR_COOKIE)?.value) ||
      randomUUID();
    if (body.kind === "visit") {
      const sessionId = parseVisitorId(body.sessionId);
      if (sessionId) {
        publishSiteVisit({ visitorId, sessionId });
      }
    } else {
      const businessIds = uniqueIds(body.businessIds);
      const slugs = uniqueIds(body.slugs);
      if (businessIds.length || slugs.length) {
        publishListingAnalytics({
          kind: body.kind,
          visitorId,
          businessIds,
          slugs,
        });
      }
    }
    const response = NextResponse.json({ ok: true }, { status: 202 });
    response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid analytics event." }, 400);
    }
    return errorResponse(error);
  }
}
