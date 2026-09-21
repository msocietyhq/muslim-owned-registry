import { describe, expect, it } from "vitest";
import { pickBusinessForSlug } from "@/lib/data";
import { assertBrandPrefixedSlug, brandSlugPrefix, nextAvailableSlug, slugify } from "@/lib/slug";
import type { Business } from "@/lib/types";

describe("slugify", () => {
  it("turns a brand into a url slug", () => {
    expect(slugify("Mak Cik Kiah Catering")).toBe("mak-cik-kiah-catering");
  });
});

describe("brand-prefixed slugs", () => {
  it("accepts the brand slug itself", () => {
    expect(assertBrandPrefixedSlug("Warong Selamat", "warong-selamat")).toBe(
      "warong-selamat",
    );
  });

  it("accepts a brand-prefixed variant", () => {
    expect(assertBrandPrefixedSlug("Warong Selamat", "warong-selamat-tampines")).toBe(
      "warong-selamat-tampines",
    );
  });

  it("rejects a slug that drops the brand", () => {
    expect(() => assertBrandPrefixedSlug("Warong Selamat", "tampines-warong")).toThrow(
      /start with/,
    );
  });

  it("requires letters or numbers in the brand", () => {
    expect(() => brandSlugPrefix("!!!")).toThrow(/letters or numbers/);
  });
});

describe("nextAvailableSlug", () => {
  it("keeps the brand slug when it is free", () => {
    expect(nextAvailableSlug("playtours", [])).toBe("playtours");
  });

  it("adds -2 then -3 when the brand slug is taken", () => {
    expect(nextAvailableSlug("playtours", ["playtours"])).toBe("playtours-2");
    expect(nextAvailableSlug("playtours", ["playtours", "playtours-2"])).toBe("playtours-3");
  });

  it("does not treat a pending duplicate as a reason to skip -2", () => {
    expect(nextAvailableSlug("playtours", ["playtours-2"])).toBe("playtours");
  });
});

describe("pickBusinessForSlug", () => {
  it("prefers the live listing when pending rows share a slug", () => {
    const pending = { slug: "playtours", status: "pending_review" } as Business;
    const live = { slug: "playtours", status: "live" } as Business;
    expect(pickBusinessForSlug([pending, live])?.status).toBe("live");
    expect(pickBusinessForSlug([pending])?.status).toBe("pending_review");
    expect(pickBusinessForSlug([])).toBeNull();
  });
});
