import { describe, expect, it } from "vitest";
import { needsOwnerPublicName } from "@/lib/owner-name";

describe("owner public name", () => {
  it("is required only on the first listing", () => {
    expect(needsOwnerPublicName(0)).toBe(true);
    expect(needsOwnerPublicName(1)).toBe(false);
    expect(needsOwnerPublicName(4)).toBe(false);
  });
});
