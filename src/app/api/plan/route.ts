import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, json } from "@/lib/http";
import { listingSlugsFromGroups, publishListingAnalytics } from "@/lib/listing-analytics";
import { planFromIntent, translatePlanGroups } from "@/lib/plan";
import { incrementSearchCount } from "@/lib/stats";
import {
  SEARCH_COUNTED_COOKIE,
  searchCountedCookieOptions,
  shouldCountSearch,
} from "@/lib/stats-client";
import { parseVisitorId, VISITOR_COOKIE, visitorCookieOptions } from "@/lib/visitor";

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({
        intent: z.string().min(3).max(400),
        lang: z.enum(["en", "ms", "zh", "ta"]).optional(),
        countSearch: z.boolean().optional().default(true),
        visitorId: z.string().optional(),
      })
      .parse(await request.json());
    const result = await planFromIntent(body.intent);
    const groups = await translatePlanGroups(result.groups, body.lang);

    const countThisBrowser = shouldCountSearch(
      request.cookies.get(SEARCH_COUNTED_COOKIE)?.value,
      body.countSearch,
    );
    let searches: number | undefined;
    if (countThisBrowser) {
      try {
        searches = await incrementSearchCount();
      } catch (error) {
        console.error("incrementSearchCount", error);
      }
    }

    const visitorId =
      parseVisitorId(body.visitorId) ||
      parseVisitorId(request.cookies.get(VISITOR_COOKIE)?.value) ||
      randomUUID();
    const impressionSlugs = listingSlugsFromGroups(groups);
    if (impressionSlugs.length) {
      publishListingAnalytics({
        kind: "impression",
        visitorId,
        slugs: impressionSlugs,
      });
    }

    const response = NextResponse.json({ ...result, groups, searches });
    response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions());
    if (countThisBrowser) {
      response.cookies.set(SEARCH_COUNTED_COOKIE, "1", searchCountedCookieOptions());
    }
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Describe what you need in a short sentence." }, 400);
    }
    return errorResponse(error);
  }
}
