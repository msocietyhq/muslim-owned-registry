import { describe, expect, it } from "vitest";
import { pageByName, PUBLIC_PAGE_SIZE } from "@/lib/public-catalog";
import { searchCacheKey } from "@/lib/search-cache";

describe("public agent API", () => {
  it("treats the same sentence as one search", () => {
    expect(searchCacheKey("  A   plumber in Tampines ")).toBe("a plumber in tampines");
    expect(searchCacheKey("a plumber in Tampines")).toBe(searchCacheKey("A plumber in Tampines"));
  });

  it("pages the catalogue alphabetically, 50 at a time", () => {
    const items = Array.from({ length: 120 }, (_, index) => ({
      id: String(index).padStart(3, "0"),
      brandName: `Brand ${String.fromCharCode(97 + (index % 26))}${index}`,
    }));
    const first = pageByName(items, 1);
    expect(first.pageSize).toBe(PUBLIC_PAGE_SIZE);
    expect(first.listings).toHaveLength(50);
    expect(first.total).toBe(120);
    expect(first.totalPages).toBe(3);
    expect(first.hasNext).toBe(true);
    const names = first.listings.map((item) => item.brandName);
    expect([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))).toEqual(names);

    const last = pageByName(items, 3);
    expect(last.listings).toHaveLength(20);
    expect(last.hasNext).toBe(false);

    const past = pageByName(items, 9);
    expect(past.listings).toHaveLength(0);
    expect(past.hasNext).toBe(false);
  });
});
