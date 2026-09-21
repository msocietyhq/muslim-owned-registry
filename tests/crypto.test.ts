import { describe, expect, it } from "vitest";
import { isWithinOneYear, listingOwnerChallengeExpiresAt, LISTING_OWNER_CHALLENGE_DAYS } from "@/lib/crypto";

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

describe("listing owner mail challenge", () => {
  it("stays valid for a week so the owner does not have to open mail immediately", () => {
    expect(LISTING_OWNER_CHALLENGE_DAYS).toBe(7);
    expect(listingOwnerChallengeExpiresAt("2026-09-22T00:00:00.000Z")).toBe(
      "2026-09-29T00:00:00.000Z",
    );
  });
});
