import { describe, expect, it } from "vitest";
import {
  FOUNDING_CAP,
  FOUNDING_HOMEPAGE_WEIGHT,
  foundingFeaturedUntil,
  foundingSlotsOpen,
  homepageFeatureWeight,
  nextFoundingSlot,
  planFoundingBackfill,
  shouldStartFoundingFeature,
} from "@/lib/founding";
import { shufflePickWeighted } from "@/lib/shuffle";
import type { Business } from "@/lib/types";

function listing(partial: Partial<Business> & { id: string; createdAt: string }): Business {
  return {
    ownerId: "owner",
    uen: "202400001A",
    registeredName: "Test Co",
    brandName: "Test",
    slug: partial.id,
    contactEmail: "a@example.com",
    whatsapp: null,
    whatsappTemplate: null,
    summary: "",
    description: "",
    urls: [],
    tagIds: [],
    photos: [],
    lat: null,
    lng: null,
    address: "",
    status: "pending_review",
    verificationType: "linkedin",
    linkedinUrl: "https://www.linkedin.com/in/test",
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    lastAdminNote: null,
    termsAcceptedAt: partial.createdAt,
    updatedAt: partial.createdAt,
    isDemo: null,
    foundingSlot: null,
    featuredUntil: null,
    primaryColor: null,
    secondaryColor: null,
    ...partial,
  };
}

describe("founding slots", () => {
  it("assigns the next slot in submit order and skips demos", () => {
    expect(nextFoundingSlot(0, null)).toBe(1);
    expect(nextFoundingSlot(99, false)).toBe(100);
    expect(nextFoundingSlot(100, null)).toBeNull();
    expect(nextFoundingSlot(0, true)).toBeNull();
    expect(foundingSlotsOpen(99)).toBe(true);
    expect(foundingSlotsOpen(100)).toBe(false);
  });

  it("starts the homepage window on first approval and does not reset it", () => {
    const approved = "2026-09-20T00:00:00.000Z";
    const until = foundingFeaturedUntil(approved);
    expect(until).toBe("2027-09-20T00:00:00.000Z");
    const withSlot = {
      isDemo: null,
      foundingSlot: 1,
      featuredUntil: null as string | null,
    };
    expect(shouldStartFoundingFeature(withSlot)).toBe(true);
    expect(shouldStartFoundingFeature({ ...withSlot, featuredUntil: until })).toBe(false);
    expect(shouldStartFoundingFeature({ ...withSlot, isDemo: true })).toBe(false);
  });

  it("weights founding listings 1.8× only while featuredUntil is in the future", () => {
    const now = new Date("2026-10-01T00:00:00.000Z");
    expect(
      homepageFeatureWeight(
        { isDemo: null, foundingSlot: 3, featuredUntil: "2027-09-20T00:00:00.000Z" },
        now,
      ),
    ).toBe(FOUNDING_HOMEPAGE_WEIGHT);
    expect(
      homepageFeatureWeight(
        { isDemo: null, foundingSlot: 3, featuredUntil: "2026-09-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(1);
    expect(
      homepageFeatureWeight({ isDemo: null, foundingSlot: 3, featuredUntil: null }, now),
    ).toBe(1);
  });

  it("backfills the earliest non-demo submissions first", () => {
    const plan = planFoundingBackfill([
      listing({
        id: "demo",
        createdAt: "2026-01-01T00:00:00.000Z",
        isDemo: true,
        status: "live",
        lastConfirmedAt: "2026-01-01T00:00:00.000Z",
      }),
      listing({
        id: "late",
        createdAt: "2026-03-01T00:00:00.000Z",
        status: "live",
        lastConfirmedAt: "2026-03-02T00:00:00.000Z",
      }),
      listing({
        id: "early",
        createdAt: "2026-02-01T00:00:00.000Z",
        status: "pending_review",
      }),
    ]);
    expect(plan.claimed).toBe(2);
    expect(plan.updates.map((row) => row.id)).toEqual(["early", "late"]);
    expect(plan.updates[0]).toMatchObject({ id: "early", foundingSlot: 1, featuredUntil: null });
    expect(plan.updates[1]?.foundingSlot).toBe(2);
    expect(plan.updates[1]?.featuredUntil).toBe("2027-03-02T00:00:00.000Z");
  });

  it("does not hand out more than 100 slots", () => {
    const businesses = Array.from({ length: FOUNDING_CAP + 5 }, (_, index) =>
      listing({
        id: `b${index}`,
        createdAt: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    const plan = planFoundingBackfill(businesses);
    expect(plan.claimed).toBe(FOUNDING_CAP);
    expect(plan.updates).toHaveLength(FOUNDING_CAP);
  });
});

describe("shufflePickWeighted", () => {
  it("returns unique items up to the requested count", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const picked = shufflePickWeighted(items, 9, () => 1, () => 0.2);
    expect(picked).toHaveLength(9);
    expect(new Set(picked).size).toBe(9);
  });

  it("picks heavier items more often across many draws", () => {
    const items = ["heavy", "light"];
    let heavy = 0;
    for (let i = 0; i < 400; i += 1) {
      const [picked] = shufflePickWeighted(items, 1, (item) => (item === "heavy" ? 1.8 : 1));
      if (picked === "heavy") heavy += 1;
    }
    expect(heavy).toBeGreaterThan(220);
  });
});
