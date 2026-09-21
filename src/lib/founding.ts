import { addDays } from "@/lib/crypto";
import { canReadFirestore } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import { isDemoListing, type Business, type BusinessStatus } from "@/lib/types";

export const FOUNDING_CAP = 100;
export const FOUNDING_FEATURE_DAYS = 365;
export const FOUNDING_HOMEPAGE_WEIGHT = 1.8;
export const DEFAULT_HOMEPAGE_WEIGHT = 1;
export const FOUNDING_STATS_DOC = "stats/founding";

export function parseFoundingSlot(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > FOUNDING_CAP) return null;
  return value;
}

export function parseFeaturedUntil(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function nextFoundingSlot(claimed: number, isDemo: boolean | null): number | null {
  if (isDemo === true) return null;
  const used = Number.isFinite(claimed) ? Math.max(0, Math.floor(claimed)) : 0;
  if (used >= FOUNDING_CAP) return null;
  return used + 1;
}

export function foundingSlotsOpen(claimed: number): boolean {
  const used = Number.isFinite(claimed) ? Math.max(0, Math.floor(claimed)) : 0;
  return used < FOUNDING_CAP;
}

export function foundingFeaturedUntil(approvedAt: string): string {
  return addDays(approvedAt, FOUNDING_FEATURE_DAYS);
}

export function shouldStartFoundingFeature(business: {
  isDemo: boolean | null;
  foundingSlot: number | null;
  featuredUntil: string | null;
}): boolean {
  if (isDemoListing(business)) return false;
  if (parseFoundingSlot(business.foundingSlot) == null) return false;
  return !parseFeaturedUntil(business.featuredUntil);
}

function wasApproved(status: BusinessStatus) {
  return (
    status === "live" ||
    status === "unpublished" ||
    status === "pending_activation" ||
    status === "removed"
  );
}

export function homepageFeatureWeight(
  business: {
    isDemo: boolean | null;
    foundingSlot: number | null;
    featuredUntil: string | null;
  },
  now = new Date(),
): number {
  if (isDemoListing(business)) return DEFAULT_HOMEPAGE_WEIGHT;
  if (parseFoundingSlot(business.foundingSlot) == null) return DEFAULT_HOMEPAGE_WEIGHT;
  const until = parseFeaturedUntil(business.featuredUntil);
  if (!until) return DEFAULT_HOMEPAGE_WEIGHT;
  if (new Date(until).getTime() <= now.getTime()) return DEFAULT_HOMEPAGE_WEIGHT;
  return FOUNDING_HOMEPAGE_WEIGHT;
}

export type FoundingBackfillRow = {
  id: string;
  foundingSlot: number;
  featuredUntil: string | null;
};

export function planFoundingBackfill(businesses: Business[]): {
  claimed: number;
  updates: FoundingBackfillRow[];
} {
  const eligible = businesses
    .filter((business) => !isDemoListing(business))
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  const taken = new Set<number>();
  for (const business of eligible) {
    const slot = parseFoundingSlot(business.foundingSlot);
    if (slot != null) taken.add(slot);
  }

  const updates: FoundingBackfillRow[] = [];
  let cursor = 1;
  for (const business of eligible) {
    let slot = parseFoundingSlot(business.foundingSlot);
    if (slot == null) {
      while (taken.has(cursor) && cursor <= FOUNDING_CAP) cursor += 1;
      if (cursor > FOUNDING_CAP) break;
      slot = cursor;
      taken.add(slot);
      cursor += 1;
    }

    let featuredUntil = parseFeaturedUntil(business.featuredUntil);
    if (
      !featuredUntil &&
      wasApproved(business.status) &&
      business.lastConfirmedAt &&
      shouldStartFoundingFeature({
        isDemo: business.isDemo,
        foundingSlot: slot,
        featuredUntil: null,
      })
    ) {
      featuredUntil = foundingFeaturedUntil(business.lastConfirmedAt);
    }

    if (business.foundingSlot !== slot || business.featuredUntil !== featuredUntil) {
      updates.push({ id: business.id, foundingSlot: slot, featuredUntil });
    }
  }

  return { claimed: Math.min(FOUNDING_CAP, taken.size), updates };
}

export async function getFoundingClaimed() {
  try {
    if (!(await canReadFirestore())) return 0;
    const { db } = initAdmin();
    const snap = await db.doc(FOUNDING_STATS_DOC).get();
    const value = snap.data()?.claimed;
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(FOUNDING_CAP, Math.floor(value)))
      : 0;
  } catch (error) {
    console.error("getFoundingClaimed", error);
    return 0;
  }
}
