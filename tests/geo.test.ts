import { describe, expect, it } from "vitest";
import {
  extractPlace,
  haversineKm,
  nearbyBusinesses,
  parseLatLng,
  submittedPin,
} from "@/lib/geo";

describe("geo", () => {
  it("accepts a Singapore pin and rejects a missing pair", () => {
    expect(parseLatLng(1.3396, 103.7063)).toEqual({ lat: 1.3396, lng: 103.7063 });
    expect(parseLatLng(null, 103.7)).toBeNull();
    expect(parseLatLng(51.5, -0.12)).toBeNull();
  });

  it("reads Jurong West out of a search sentence", () => {
    const place = extractPlace("shops near jurong west for a school uniform");
    expect(place?.name).toBe("jurong west");
    expect(place?.point.lng).toBeCloseTo(103.7063, 2);
  });

  it("ranks nearby pins and skips online listings", () => {
    const origin = { lat: 1.3396, lng: 103.7063 };
    const items = [
      { slug: "online", lat: null, lng: null },
      { slug: "tuas", lat: 1.321, lng: 103.649 },
      { slug: "tampines", lat: 1.353, lng: 103.945 },
    ];
    const nearby = nearbyBusinesses(origin, items);
    expect(nearby.map((row) => row.item.slug)).toEqual(["tuas"]);
    const wide = nearbyBusinesses(origin, items, 40);
    expect(wide.map((row) => row.item.slug)).toEqual(["tuas", "tampines"]);
    expect(wide[0]!.km).toBeLessThan(wide[1]!.km);
    expect(haversineKm(origin, origin)).toBeCloseTo(0, 5);
  });

  it("treats a missing pin as online and rejects a pin outside Singapore", () => {
    expect(submittedPin(null, null)).toBeNull();
    expect(() => submittedPin(1.34, null)).toThrow(/Singapore/);
    expect(() => submittedPin(51.5, -0.12)).toThrow(/Singapore/);
  });
});
