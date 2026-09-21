import { describe, expect, it } from "vitest";
import {
  dispatchListingAnalytics,
  listingSeenDocId,
  listingSlugsFromGroups,
  listingStatsIncrements,
  shouldCountListing,
  subscribeListingAnalytics,
  uniqueIds,
} from "@/lib/listing-analytics-bus";
import {
  addVisibleTime,
  isPublicAnalyticsPath,
  shouldQualifyVisit,
  SITE_VISIT_DWELL_MS,
} from "@/lib/site-analytics-core";
import { parseVisitorId } from "@/lib/visitor";

describe("listing analytics", () => {
  it("keeps a stable seen-doc id per kind, listing, and visitor", () => {
    expect(
      listingSeenDocId(
        "view",
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ),
    ).toBe(
      "view_11111111-1111-4111-8111-111111111111_22222222-2222-4222-8222-222222222222",
    );
  });

  it("dedupes targets and caps the batch", () => {
    expect(uniqueIds([" a ", "a", "", "b", 3, "c"], 2)).toEqual(["a", "b"]);
  });

  it("collects unique listing slugs from search groups", () => {
    expect(
      listingSlugsFromGroups([
        { businesses: [{ slug: "makcik-cakes" }, { slug: "hall-sengkang" }] },
        { businesses: [{ slug: "makcik-cakes" }, { slug: "fix-it" }] },
      ]),
    ).toEqual(["makcik-cakes", "hall-sengkang", "fix-it"]);
    expect(listingSlugsFromGroups([])).toEqual([]);
  });

  it("counts only live, non-demo listings", () => {
    expect(shouldCountListing({ status: "live", isDemo: null })).toBe(true);
    expect(shouldCountListing({ status: "live", isDemo: false })).toBe(true);
    expect(shouldCountListing({ status: "live", isDemo: true })).toBe(false);
    expect(shouldCountListing({ status: "draft", isDemo: null })).toBe(false);
  });

  it("accepts a browser visitor id and rejects junk", () => {
    expect(parseVisitorId("AAAAAAAA-1111-4111-8111-111111111111")).toBe(
      "aaaaaaaa-1111-4111-8111-111111111111",
    );
    expect(parseVisitorId("not-a-uuid")).toBeNull();
    expect(parseVisitorId("")).toBeNull();
  });

  it("notifies subscribers without blocking the publisher", async () => {
    const received: string[] = [];
    const stop = subscribeListingAnalytics((event) => {
      received.push(`${event.kind}:${event.visitorId}`);
    });
    await dispatchListingAnalytics({
      kind: "impression",
      visitorId: "aaaaaaaa-1111-4111-8111-111111111111",
      slugs: ["makcik-cakes"],
    });
    stop();
    await dispatchListingAnalytics({
      kind: "view",
      visitorId: "aaaaaaaa-1111-4111-8111-111111111111",
      businessIds: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(received).toEqual(["impression:aaaaaaaa-1111-4111-8111-111111111111"]);
  });
});

describe("listing click increments", () => {
  it("counts every listing open as a click and first opens as unique", () => {
    expect(listingStatsIncrements("view", true)).toEqual({
      clicks: true,
      uniqueViews: true,
      uniqueImpressions: false,
    });
    expect(listingStatsIncrements("view", false)).toEqual({
      clicks: true,
      uniqueViews: false,
      uniqueImpressions: false,
    });
    expect(listingStatsIncrements("impression", true)).toEqual({
      clicks: false,
      uniqueViews: false,
      uniqueImpressions: true,
    });
    expect(listingStatsIncrements("impression", false)).toEqual({
      clicks: false,
      uniqueViews: false,
      uniqueImpressions: false,
    });
  });
});

describe("site visits", () => {
  it("qualifies a visitor only after one minute of visible time", () => {
    expect(shouldQualifyVisit(SITE_VISIT_DWELL_MS - 1, false)).toBe(false);
    expect(shouldQualifyVisit(SITE_VISIT_DWELL_MS, false)).toBe(true);
    expect(shouldQualifyVisit(SITE_VISIT_DWELL_MS + 5_000, true)).toBe(false);
  });

  it("adds time only while the tab is visible", () => {
    expect(addVisibleTime(10_000, 5_000, true)).toBe(15_000);
    expect(addVisibleTime(10_000, 5_000, false)).toBe(10_000);
  });

  it("ignores owner and admin pages", () => {
    expect(isPublicAnalyticsPath("/")).toBe(true);
    expect(isPublicAnalyticsPath("/browse")).toBe(true);
    expect(isPublicAnalyticsPath("/biz/makcik-cakes")).toBe(true);
    expect(isPublicAnalyticsPath("/admin")).toBe(false);
    expect(isPublicAnalyticsPath("/app/businesses/new")).toBe(false);
    expect(isPublicAnalyticsPath("/login")).toBe(false);
    expect(isPublicAnalyticsPath("/m/token")).toBe(false);
  });
});
