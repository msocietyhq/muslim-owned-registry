import { describe, expect, it } from "vitest";
import { heuristicTagIds } from "@/lib/suggest-tags";
import type { Tag } from "@/lib/types";

const tags: Tag[] = [
  { id: "bakery", name: "Bakery", slug: "bakery", parentId: "food" },
  { id: "catering", name: "Catering", slug: "catering", parentId: "food" },
  { id: "food", name: "Food", slug: "food", parentId: null },
  { id: "photography", name: "Photography", slug: "photography", parentId: null },
];

describe("tag suggestions", () => {
  it("picks tags from the brand name and description", () => {
    const ids = heuristicTagIds(
      "Makcik Cakes kenduri catering from a Jurong West kitchen",
      tags,
    );
    expect(ids).toContain("bakery");
    expect(ids).toContain("catering");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(4);
  });

  it("returns nothing when the copy does not match a tag", () => {
    expect(heuristicTagIds("Hello", tags)).toEqual([]);
  });
});
