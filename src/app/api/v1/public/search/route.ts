import { NextRequest } from "next/server";
import { z } from "zod";
import { getLiveBusinesses, getTags } from "@/lib/data";
import { errorResponse, json } from "@/lib/http";
import { planFromIntent, translatePlanGroups } from "@/lib/plan";
import { ownersById, toPublicListing } from "@/lib/public-listing";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({
        query: z.string().min(3).max(400),
        lang: z.enum(["en", "ms", "zh", "ta"]).optional(),
      })
      .parse(await request.json());
    const result = await planFromIntent(body.query);
    const groups = await translatePlanGroups(result.groups, body.lang);
    const [businesses, tags] = await Promise.all([getLiveBusinesses(), getTags()]);
    const bySlug = new Map(businesses.map((business) => [business.slug, business]));
    const owners = await ownersById(
      groups.flatMap((group) =>
        group.businesses.map((item) => bySlug.get(item.slug)?.ownerId || ""),
      ),
    );
    const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
    const origin = siteUrl();
    return json({
      groups: groups.map((group) => ({
        title: group.title,
        reason: group.reason,
        businesses: group.businesses.map((item) => {
          const business = bySlug.get(item.slug);
          if (!business) {
            return { slug: item.slug, brandName: item.brandName, url: `${origin}/biz/${item.slug}` };
          }
          return toPublicListing(business, tagNames, origin, owners.get(business.ownerId) || null);
        }),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Describe what you need in a short sentence." }, 400);
    }
    return errorResponse(error);
  }
}
