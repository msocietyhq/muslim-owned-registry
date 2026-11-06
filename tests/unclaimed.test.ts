import { describe, expect, it } from "vitest";
import { placeUnclaimedLast, withUnclaimedReasons } from "@/lib/plan";
import { listingIsUnclaimed, sampleUnclaimedLast, sortUnclaimedLast } from "@/lib/unclaimed";

describe("unclaimed listings", () => {
  const accounts = new Set(["owner-1"]);

  it("treats a missing account as unclaimed and leaves demos claimed", () => {
    expect(listingIsUnclaimed({ isDemo: false, ownerId: "" }, accounts)).toBe(true);
    expect(listingIsUnclaimed({ isDemo: null, ownerId: "missing" }, accounts)).toBe(true);
    expect(listingIsUnclaimed({ isDemo: false, ownerId: "owner-1" }, accounts)).toBe(false);
    expect(listingIsUnclaimed({ isDemo: true, ownerId: "" }, accounts)).toBe(false);
  });

  it("tells search results when a match is unclaimed", () => {
    const groups = withUnclaimedReasons(
      [
        {
          reason: "Food and catering.",
          businesses: [{ slug: "example-harbour-kopi" }],
        },
        {
          reason: "Already says this page is unclaimed.",
          businesses: [{ slug: "example-harbour-kopi" }],
        },
      ],
      [{ slug: "example-harbour-kopi", unclaimed: true }],
    );
    expect(groups[0]?.reason).toContain("unclaimed and unverified");
    expect(groups[1]?.reason).toBe("Already says this page is unclaimed.");
  });

  it("keeps unclaimed listings at the end of a list and inside a search group", () => {
    expect(sortUnclaimedLast([
      { id: "u", unclaimed: true },
      { id: "a", unclaimed: false },
      { id: "b", unclaimed: false },
    ]).map((item) => item.id)).toEqual(["a", "b", "u"]);

    const grouped = placeUnclaimedLast(
      [{ businesses: [{ slug: "unclaimed" }, { slug: "claimed" }, { slug: "also" }] }],
      [
        { slug: "unclaimed", unclaimed: true },
        { slug: "claimed", unclaimed: false },
        { slug: "also", unclaimed: false },
      ],
    );
    expect(grouped[0]?.businesses.map((item) => item.slug)).toEqual(["claimed", "also", "unclaimed"]);

    const sample = sampleUnclaimedLast(
      [
        { id: "c1" },
        { id: "c2" },
        { id: "c3" },
        { id: "u1", unclaimed: true },
      ],
      3,
      (pool, count) => pool.slice(0, count),
    );
    expect(sample.map((item) => item.id)).toEqual(["c1", "c2", "u1"]);
  });
});
