import { NextRequest } from "next/server";
import { getAllBusinesses } from "@/lib/data";
import { errorResponse, json, requireAdmin } from "@/lib/http";
import { getListingStatsMap } from "@/lib/listing-analytics";
import { getSiteVisitorStats } from "@/lib/site-analytics";
import { isDemoListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const businesses = (await getAllBusinesses()).filter(
      (business) => !isDemoListing(business) && business.status !== "removed",
    );
    const [visitors, stats] = await Promise.all([
      getSiteVisitorStats(),
      getListingStatsMap(businesses.map((business) => business.id)),
    ]);
    const listings = businesses
      .map((business) => ({
        id: business.id,
        brandName: business.brandName,
        slug: business.slug,
        status: business.status,
        clicks: stats[business.id]?.clicks ?? 0,
        uniqueViews: stats[business.id]?.uniqueViews ?? 0,
      }))
      .sort(
        (a, b) =>
          b.clicks - a.clicks ||
          b.uniqueViews - a.uniqueViews ||
          a.brandName.localeCompare(b.brandName),
      );
    return json({ visitors, listings });
  } catch (error) {
    return errorResponse(error);
  }
}
