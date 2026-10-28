import { NextRequest } from "next/server";
import { resetOwnerSeoGeo } from "@/lib/seo-geo/chat";
import { errorResponse, json, requireUser } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const result = await resetOwnerSeoGeo(user.uid);
    return json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
