export const LISTING_ANALYTICS_MAX_TARGETS = 80;

export type ListingAnalyticsKind = "view" | "impression";

export type ListingAnalyticsEvent = {
  kind: ListingAnalyticsKind;
  visitorId: string;
  businessIds?: string[];
  slugs?: string[];
};

type Handler = (event: ListingAnalyticsEvent) => Promise<void> | void;

const handlers = new Set<Handler>();

export function uniqueIds(values: unknown, limit = LISTING_ANALYTICS_MAX_TARGETS) {
  const out: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(values)) return out;
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

export function listingSeenDocId(
  kind: ListingAnalyticsKind,
  businessId: string,
  visitorId: string,
) {
  return `${kind}_${businessId}_${visitorId}`;
}

export function listingSlugsFromGroups(
  groups: { businesses: { slug: string }[] }[] | null | undefined,
) {
  if (!groups?.length) return [];
  return uniqueIds(groups.flatMap((group) => group.businesses.map((item) => item.slug)));
}

export function shouldCountListing(business: {
  status: string;
  isDemo: boolean | null;
}) {
  return business.status === "live" && business.isDemo !== true;
}

export function listingStatsIncrements(
  kind: ListingAnalyticsKind,
  isNewUnique: boolean,
) {
  return {
    clicks: kind === "view",
    uniqueViews: kind === "view" && isNewUnique,
    uniqueImpressions: kind === "impression" && isNewUnique,
  };
}

export function subscribeListingAnalytics(handler: Handler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export async function dispatchListingAnalytics(event: ListingAnalyticsEvent) {
  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (error) {
      console.error("listing analytics", error);
    }
  }
}
