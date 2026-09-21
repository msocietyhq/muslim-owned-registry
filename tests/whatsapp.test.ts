import { describe, expect, it } from "vitest";
import {
  formatWhatsappDisplay,
  parseWhatsappNumber,
  submittedWhatsapp,
  whatsappHref,
} from "@/lib/whatsapp";

describe("WhatsApp numbers", () => {
  it("defaults 8-digit numbers to Singapore +65", () => {
    expect(parseWhatsappNumber("9123 4567")).toBe("6591234567");
    expect(parseWhatsappNumber("91234567")).toBe("6591234567");
    expect(parseWhatsappNumber("+65 9123 4567")).toBe("6591234567");
    expect(parseWhatsappNumber("65 91234567")).toBe("6591234567");
    expect(formatWhatsappDisplay("6591234567")).toBe("+65 9123 4567");
  });

  it("keeps overseas numbers that already have a country code", () => {
    expect(parseWhatsappNumber("+60 12 345 6789")).toBe("60123456789");
    expect(parseWhatsappNumber("0060123456789")).toBe("60123456789");
    expect(parseWhatsappNumber("")).toBeNull();
    expect(parseWhatsappNumber("123")).toBeNull();
  });

  it("builds a wa.me link with an optional opening message", () => {
    expect(whatsappHref("6591234567")).toBe("https://wa.me/6591234567");
    expect(whatsappHref("6591234567", "Hi, I found you on muslimowned.sg")).toBe(
      "https://wa.me/6591234567?text=Hi%2C%20I%20found%20you%20on%20muslimowned.sg",
    );
  });

  it("rejects a number that cannot be parsed", () => {
    expect(() => submittedWhatsapp("12")).toThrow(/Singapore WhatsApp number/);
    expect(submittedWhatsapp("")).toBeNull();
  });
});
