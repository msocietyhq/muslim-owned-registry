import { NextRequest } from "next/server";
import { getLiveBusinesses, getTags } from "@/lib/data";
import { errorResponse, json } from "@/lib/http";
import { pageByName } from "@/lib/public-catalog";
import { ownersById, toPublicListing } from "@/lib/public-listing";
import { siteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  try {
    const requested = Number(request.nextUrl.searchParams.get("page") || "1");
    const [businesses, tags] = await Promise.all([getLiveBusinesses(), getTags()]);
    const origin = siteUrl();
    const paged = pageByName(businesses, requested);
    const owners = await ownersById(paged.listings.map((business) => business.ownerId));
    const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
    const listings = paged.listings.map((business) =>
      toPublicListing(business, tagNames, origin, owners.get(business.ownerId) || null),
    );
    const next =
      paged.hasNext ? `${origin}/api/v1/public/listings?page=${paged.page + 1}` : null;
    return json({
      page: paged.page,
      pageSize: paged.pageSize,
      total: paged.total,
      totalPages: paged.totalPages,
      next,
      listings,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
