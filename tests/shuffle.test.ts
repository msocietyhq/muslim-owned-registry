import { describe, expect, it } from "vitest";
import { shufflePick } from "@/lib/shuffle";

describe("shufflePick", () => {
  it("returns at most the requested count without losing items from the source", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const picked = shufflePick(items, 9, () => 0.2);
    expect(picked).toHaveLength(9);
    expect(new Set(picked).size).toBe(9);
    expect(picked.every((item) => items.includes(item))).toBe(true);
  });

  it("returns the whole list when fewer than the requested count exist", () => {
    expect(shufflePick(["one", "two"], 9)).toHaveLength(2);
    expect(shufflePick(["one", "two"], 9).sort()).toEqual(["one", "two"]);
  });
});
