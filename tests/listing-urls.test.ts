import { describe, expect, it } from "vitest";
import {
  listingFieldsFromUrls,
  listingUrlsFromFields,
  normalizeListingUrl,
} from "@/lib/listing-urls";

describe("listing URLs", () => {
  it("adds https when the owner types a domain", () => {
    expect(normalizeListingUrl("www.makcik.sg")).toBe("https://www.makcik.sg/");
    expect(normalizeListingUrl("")).toBeNull();
    expect(normalizeListingUrl("not-a-url")).toBeNull();
  });

  it("maps labeled rows onto website, Instagram, Facebook, and TikTok", () => {
    const urls = listingUrlsFromFields({
      website: "https://makcik.sg",
      instagram: "instagram.com/makcik",
      facebook: "",
      tiktok: "https://www.tiktok.com/@makcik",
    });
    expect(urls).toEqual([
      { url: "https://makcik.sg/", label: "Website" },
      { url: "https://instagram.com/makcik", label: "Instagram" },
      { url: "https://www.tiktok.com/@makcik", label: "TikTok" },
    ]);

    const fields = listingFieldsFromUrls([
      { url: "https://makcik.sg", label: "Corporate" },
      { url: "https://www.instagram.com/makcik", label: "Instagram" },
    ]);
    expect(fields.website).toBe("https://makcik.sg");
    expect(fields.instagram).toBe("https://www.instagram.com/makcik");
    expect(fields.facebook).toBe("");
    expect(fields.tiktok).toBe("");
  });
});
