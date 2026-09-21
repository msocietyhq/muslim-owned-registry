import { after } from "next/server";
import { canReadFirestore, getBusiness, getBusinessesBySlugs } from "@/lib/data";
import { FieldValue } from "@/lib/db/documents";
import { initAdmin } from "@/lib/firebase/admin";
import {
  dispatchListingAnalytics,
  listingSeenDocId,
  listingStatsIncrements,
  shouldCountListing,
  subscribeListingAnalytics,
  uniqueIds,
  type ListingAnalyticsEvent,
  type ListingAnalyticsKind,
} from "@/lib/listing-analytics-bus";
import type { ListingStats } from "@/lib/types";

export type { ListingAnalyticsEvent, ListingAnalyticsKind } from "@/lib/listing-analytics-bus";
export {
  listingSeenDocId,
  listingSlugsFromGroups,
  listingStatsIncrements,
  shouldCountListing,
  uniqueIds,
} from "@/lib/listing-analytics-bus";

export const LISTING_STATS_COLLECTION = "listing_stats";
export const LISTING_SEEN_COLLECTION = "listing_seen";

export const emptyListingStats = (): ListingStats => ({
  uniqueViews: 0,
  uniqueImpressions: 0,
  clicks: 0,
});

let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  subscribeListingAnalytics(recordListingAnalytics);
}

export function publishListingAnalytics(event: ListingAnalyticsEvent) {
  const visitorId = event.visitorId.trim();
  const businessIds = uniqueIds(event.businessIds);
  const slugs = uniqueIds(event.slugs);
  if (!visitorId || (!businessIds.length && !slugs.length)) return;
  ensureSubscribed();
  after(() =>
    dispatchListingAnalytics({
      kind: event.kind,
      visitorId,
      businessIds,
      slugs,
    }),
  );
}

export async function recordListingAnalytics(event: ListingAnalyticsEvent) {
  if (!(await canReadFirestore())) return;
  const businesses = await resolveTargets(event);
  if (!businesses.length) return;
  await Promise.all(
    businesses.map((business) =>
      recordUnique(event.kind, business.id, event.visitorId),
    ),
  );
}

export async function getListingStatsMap(ids: string[]) {
  const result: Record<string, ListingStats> = {};
  const unique = uniqueIds(ids);
  for (const id of unique) result[id] = emptyListingStats();
  if (!unique.length || !(await canReadFirestore())) return result;
  try {
    const { db } = initAdmin();
    const refs = unique.map((id) => db.collection(LISTING_STATS_COLLECTION).doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      result[snap.id] = parseListingStats(snap.data());
    }
  } catch (error) {
    console.error("getListingStatsMap", error);
  }
  return result;
}

function parseListingStats(data: Record<string, unknown> | undefined): ListingStats {
  return {
    uniqueViews: finiteCount(data?.uniqueViews),
    uniqueImpressions: finiteCount(data?.uniqueImpressions),
    clicks: finiteCount(data?.clicks),
  };
}

function finiteCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

async function resolveTargets(event: ListingAnalyticsEvent) {
  const businessIds = uniqueIds(event.businessIds);
  const slugs = uniqueIds(event.slugs);
  const [fromIds, fromSlugs] = await Promise.all([
    Promise.all(businessIds.map((id) => getBusiness(id))),
    slugs.length ? getBusinessesBySlugs(slugs) : Promise.resolve([]),
  ]);
  const seen = new Set<string>();
  const out = [];
  for (const business of [...fromIds, ...fromSlugs]) {
    if (!business || seen.has(business.id) || !shouldCountListing(business)) continue;
    seen.add(business.id);
    out.push(business);
  }
  return out;
}

async function recordUnique(
  kind: ListingAnalyticsKind,
  businessId: string,
  visitorId: string,
) {
  const { db } = initAdmin();
  const seenRef = db
    .collection(LISTING_SEEN_COLLECTION)
    .doc(listingSeenDocId(kind, businessId, visitorId));
  const statsRef = db.collection(LISTING_STATS_COLLECTION).doc(businessId);
  const now = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const seen = await tx.get(seenRef);
    const increments = listingStatsIncrements(kind, !seen.exists);
    if (!increments.clicks && !increments.uniqueViews && !increments.uniqueImpressions) {
      return;
    }
    if (!seen.exists) {
      tx.create(seenRef, {
        kind,
        businessId,
        visitorId,
        createdAt: now,
      });
    }
    const statsUpdate: Record<string, unknown> = { updatedAt: now };
    if (increments.clicks) statsUpdate.clicks = FieldValue.increment(1);
    if (increments.uniqueViews) statsUpdate.uniqueViews = FieldValue.increment(1);
    if (increments.uniqueImpressions) statsUpdate.uniqueImpressions = FieldValue.increment(1);
    tx.set(statsRef, statsUpdate, { merge: true });
  });
}
