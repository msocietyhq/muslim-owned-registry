import { describe, expect, it } from "vitest";
import { isWithinOneYear } from "@/lib/crypto";

describe("UEN downloaded date", () => {
  it("accepts a document from this year", () => {
    const now = new Date("2026-09-17T00:00:00Z");
    expect(isWithinOneYear("2026-03-01", now)).toBe(true);
  });

  it("rejects a document older than 12 months", () => {
    const now = new Date("2026-09-17T00:00:00Z");
    expect(isWithinOneYear("2025-01-01", now)).toBe(false);
  });
});
