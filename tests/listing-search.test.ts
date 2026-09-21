import { describe, expect, it } from "vitest";
import {
  CLOSE_MATCH_SCORE,
  listingMatchScore,
  listingMatchesQuery,
  listingTextFields,
  normalizeSearchText,
  uniqueListings,
} from "@/lib/listing-search";
import { mergeTextMatches } from "@/lib/plan";

describe("listing search", () => {
  it("ignores case, spacing, and special characters", () => {
    expect(normalizeSearchText("Makcik-Cakes!")).toBe("makcikcakes");
    expect(
      listingMatchesQuery("makcik cakes", listingTextFields({ brandName: "Makcik-Cakes", summary: "" })),
    ).toBe(true);
    expect(
      listingMatchesQuery("MAKCIKCAKES", listingTextFields({ brandName: "Makcik Cakes", summary: "" })),
    ).toBe(true);
  });

  it("matches registered company name and description text", () => {
    expect(
      listingMatchesQuery(
        "nur spaces",
        listingTextFields({
          brandName: "Nur Hall Tampines",
          registeredName: "Nur Spaces LLP",
          summary: "A family hall",
        }),
      ),
    ).toBe(true);
    expect(
      listingMatchesQuery(
        "kenduri buffets",
        listingTextFields({
          brandName: "West Kitchen",
          summary: "Home cooks",
          description: "We host **kenduri** buffets for families.",
        }),
      ),
    ).toBe(true);
  });

  it("drops duplicate listings by slug and by normalised name", () => {
    const unique = uniqueListings([
      { slug: "makcik-cakes", brandName: "Makcik Cakes" },
      { slug: "makcik-cakes", brandName: "Makcik Cakes" },
      { slug: "makcik-cakes-2", brandName: "Makcik  Cakes!" },
      { slug: "hall-sengkang", brandName: "Sengkang Hall", registeredName: "Sengkang Hall Pte. Ltd." },
      { slug: "hall-copy", brandName: "Other Hall", registeredName: "Sengkang Hall Pte. Ltd." },
    ]);
    expect(unique.map((item) => item.slug)).toEqual(["makcik-cakes", "hall-sengkang"]);
  });

  it("scores a brand name far above a description mention", () => {
    expect(
      listingMatchScore("playtours", {
        brandName: "PlayTours",
        registeredName: "PLAYTOURS PTE. LTD.",
        summary: "Games",
      }),
    ).toBeGreaterThanOrEqual(CLOSE_MATCH_SCORE);
    expect(
      listingMatchScore("playtours", {
        brandName: "Other Hall",
        summary: "We once used PlayTours at an event.",
      }),
    ).toBeLessThan(CLOSE_MATCH_SCORE);
  });
});

describe("merge text matches into AI groups", () => {
  const catalog = [
    {
      slug: "ai-hall",
      brandName: "AI Hall",
      registeredName: "AI Hall Pte Ltd",
      summary: "A venue",
      tags: ["venue"],
    },
    {
      slug: "text-kitchen",
      brandName: "Text Kitchen",
      registeredName: "Text Kitchen LLP",
      summary: "Home cooks",
      description: "Kenduri trays from Jurong West.",
      tags: ["food"],
    },
    {
      slug: "ai-hall-copy",
      brandName: "AI Hall",
      registeredName: "Different Co",
      summary: "Another venue with the same title",
      tags: ["venue"],
    },
    {
      slug: "playtours",
      brandName: "PlayTours",
      registeredName: "PLAYTOURS PTE. LTD.",
      summary: "An event gamification platform.",
      tags: ["it", "services"],
    },
  ];

  it("adds keyword hits the AI missed and skips duplicates", () => {
    const groups = mergeTextMatches("kenduri jurong west", catalog, [
      {
        title: "Venue",
        reason: "AI pick",
        businesses: [
          { slug: "ai-hall", brandName: "AI Hall" },
          { slug: "ai-hall-copy", brandName: "AI Hall" },
          { slug: "ai-hall", brandName: "AI Hall" },
        ],
      },
    ]);
    const slugs = groups.flatMap((group) => group.businesses.map((item) => item.slug));
    expect(slugs).toEqual(["text-kitchen", "ai-hall"]);
    expect(groups[0]?.title).toBe("Matches from your search");
    expect(groups.some((group) => group.title === "Matches from your search")).toBe(true);
  });

  it("puts a close brand-name match at the top, not after other groups", () => {
    const groups = mergeTextMatches("playtours", catalog, [
      {
        title: "Venue",
        reason: "AI pick",
        businesses: [{ slug: "ai-hall", brandName: "AI Hall" }],
      },
    ]);
    expect(groups[0]?.title).toBe("Matches from your search");
    expect(groups[0]?.businesses.map((item) => item.slug)).toEqual(["playtours"]);
    expect(groups[1]?.title).toBe("Venue");
  });

  it("lifts a closer extra above loosely related groups", () => {
    const groups = mergeTextMatches("event gamification", catalog, [
      {
        title: "Food",
        reason: "The query mentioned an event",
        businesses: [{ slug: "ai-hall", brandName: "AI Hall" }],
      },
    ]);
    expect(groups[0]?.businesses[0]?.slug).toBe("playtours");
  });
});
