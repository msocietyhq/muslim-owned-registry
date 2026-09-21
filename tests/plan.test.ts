import { describe, expect, it } from "vitest";
import { heuristicPlan, keepCatalogueSlugs } from "@/lib/plan";

const catalog = [
  {
    slug: "makcik-cakes",
    brandName: "Makcik Cakes",
    summary: "Birthday cakes",
    tags: ["food", "catering"],
  },
  {
    slug: "hall-sengkang",
    brandName: "Sengkang Hall",
    summary: "Community venue",
    tags: ["venue"],
  },
];

describe("smart search", () => {
  it("drops invented slugs", () => {
    const kept = keepCatalogueSlugs(
      ["makcik-cakes", "totally-fake-biz", "hall-sengkang"],
      catalog,
    );
    expect(kept.map((item) => item.slug)).toEqual(["makcik-cakes", "hall-sengkang"]);
  });

  it("groups a birthday need from live catalogue tags", () => {
    const groups = heuristicPlan("organise a birthday party", catalog);
    const titles = groups.map((group) => group.title);
    expect(titles).toContain("Food");
    expect(titles).toContain("Venue");
  });

  it("matches a need that is not an event", () => {
    const withTrade = [
      ...catalog,
      {
        slug: "fix-it",
        brandName: "Fix It",
        summary: "Home plumbing",
        tags: ["plumbing"],
      },
    ];
    const groups = heuristicPlan("I need home plumbing in Tampines", withTrade);
    const slugs = groups.flatMap((group) => group.businesses.map((item) => item.slug));
    expect(slugs).toContain("fix-it");
  });

  it("matches text from the longer listing description", () => {
    const withDescription = [
      ...catalog,
      {
        slug: "kenduri-kitchen",
        brandName: "West Kitchen",
        summary: "Home cooks",
        description: "We host **kenduri** buffets for families in the west.",
        tags: ["services"],
      },
    ];
    const groups = heuristicPlan("buffets for families", withDescription);
    const slugs = groups.flatMap((group) => group.businesses.map((item) => item.slug));
    expect(slugs).toContain("kenduri-kitchen");
  });

  it("keeps a Jurong West pin and drops a far East pin", () => {
    const catalog = [
      {
        slug: "west-plumb",
        brandName: "West Plumb",
        summary: "Home plumbing",
        tags: ["plumbing"],
        lat: 1.3396,
        lng: 103.7063,
      },
      {
        slug: "east-plumb",
        brandName: "East Plumb",
        summary: "Home plumbing",
        tags: ["plumbing"],
        lat: 1.353,
        lng: 103.945,
      },
      {
        slug: "online-plumb",
        brandName: "Online Plumb",
        summary: "Home plumbing",
        tags: ["plumbing"],
        lat: null,
        lng: null,
      },
    ];
    const groups = heuristicPlan("I need a plumber near jurong west", catalog);
    const slugs = groups.flatMap((group) => group.businesses.map((item) => item.slug));
    expect(slugs).toContain("west-plumb");
    expect(slugs).toContain("online-plumb");
    expect(slugs).not.toContain("east-plumb");
  });
});
