import { describe, expect, it } from "vitest";
import { publicSearchCountLabel, shouldCountSearch, withCount } from "@/lib/stats-client";

describe("site stats", () => {
  it("formats a live count into the public copy", () => {
    expect(withCount("{n} searches and counting!", 123)).toBe("123 searches and counting!");
    expect(withCount("{n} businesses and growing.", 1040)).toBe("1,040 businesses and growing.");
    expect(withCount("{n} searches and counting!", -3)).toBe("0 searches and counting!");
  });

  it("hides the public search count until there are 200 searches", () => {
    expect(publicSearchCountLabel("{n} searches and counting!", 0)).toBeUndefined();
    expect(publicSearchCountLabel("{n} searches and counting!", 199)).toBeUndefined();
    expect(publicSearchCountLabel("{n} searches and counting!", 200)).toBe(
      "200 searches and counting!",
    );
  });

  it("counts a browser at most once", () => {
    expect(shouldCountSearch(undefined, true)).toBe(true);
    expect(shouldCountSearch("1", true)).toBe(false);
    expect(shouldCountSearch(undefined, false)).toBe(false);
  });
});
