import { describe, expect, it } from "vitest";
import { demoBusinesses } from "@/lib/demo-listings";
import { asBusiness } from "@/lib/data";
import { isDemoListing, parseAddress, parseDemoFlag, excludeDemoListings } from "@/lib/types";

describe("is_demo", () => {
  it("ships fifty sample listings marked as demo", () => {
    const rows = demoBusinesses();
    expect(rows).toHaveLength(50);
    expect(rows.every((row) => row.isDemo === true && row.status === "live")).toBe(true);
    expect(rows.every((row) => row.photos.length >= 1 && row.photos.length <= 5)).toBe(true);
    const stale = rows.filter((row) => {
      const months =
        (new Date("2026-09-18T00:00:00.000Z").getTime() -
          new Date(row.lastConfirmedAt || 0).getTime()) /
        (30 * 86_400_000);
      return months > 4;
    });
    expect(stale.length).toBeGreaterThan(3);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(50);
    expect(new Set(rows.map((row) => row.uen)).size).toBe(50);
    const withWhatsapp = rows.filter((row) => row.whatsapp);
    expect(withWhatsapp).toHaveLength(25);
    expect(new Set(withWhatsapp.map((row) => row.whatsapp)).size).toBe(25);
    expect(withWhatsapp.every((row) => row.whatsapp?.startsWith("65") && row.whatsapp.length === 10)).toBe(
      true,
    );
    expect(withWhatsapp.some((row) => row.whatsappTemplate)).toBe(true);
    expect(rows.filter((row) => !row.whatsapp)).toHaveLength(25);
  });
  it("parses true, false, and missing as null", () => {
    expect(parseDemoFlag(true)).toBe(true);
    expect(parseDemoFlag(false)).toBe(false);
    expect(parseDemoFlag(null)).toBe(null);
    expect(parseDemoFlag(undefined)).toBe(null);
    expect(parseDemoFlag("true")).toBe(null);
  });

  it("reads Firestore is_demo onto Business.isDemo", () => {
    const demo = asBusiness("a", {
      ownerId: "o",
      uen: "T99DM0001A",
      registeredName: "Demo Co",
      brandName: "Demo Co",
      slug: "demo-co",
      contactEmail: "demo@example.com",
      summary: "",
      description: "",
      urls: [],
      tagIds: [],
      lat: null,
      lng: null,
      status: "live",
      verificationType: "uen_document",
      linkedinUrl: null,
      uenDownloadedAt: null,
      lastConfirmedAt: null,
      confirmationDueAt: null,
      termsAcceptedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      is_demo: true,
    });
    expect(demo.isDemo).toBe(true);
    expect(isDemoListing(demo)).toBe(true);
    expect("is_demo" in demo).toBe(false);

    const real = asBusiness("b", { ...demo, is_demo: false, isDemo: undefined });
    expect(real.isDemo).toBe(false);
    expect(isDemoListing(real)).toBe(false);

    const unset = asBusiness("c", { ...demo, is_demo: undefined, isDemo: undefined });
    expect(unset.isDemo).toBe(null);
    expect(isDemoListing(unset)).toBe(false);
    expect(unset.address).toBe("");
    expect(parseAddress("  12 Orchard Road  ")).toBe("12 Orchard Road");
    expect(parseAddress(null)).toBe("");
  });

  it("drops demo listings from public catalogs without deleting them", () => {
    const rows = [
      { isDemo: true as const, slug: "demo-co" },
      { isDemo: false as const, slug: "real-co" },
      { isDemo: null, slug: "unset-co" },
    ];
    expect(excludeDemoListings(rows).map((row) => row.slug)).toEqual(["real-co", "unset-co"]);
    expect(rows).toHaveLength(3);
    expect(excludeDemoListings(demoBusinesses())).toEqual([]);
  });
});
