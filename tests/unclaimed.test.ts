import { describe, expect, it } from "vitest";
import { withUnclaimedReasons } from "@/lib/plan";
import { listingIsUnclaimed } from "@/lib/unclaimed";

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
});
