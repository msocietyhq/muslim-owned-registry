import { describe, expect, it } from "vitest";
import {
  LISTING_AI_BAD_URL,
  emptyListingAiDraft,
  extractPageHints,
  heuristicListingDraft,
  isBlockedHostname,
  parseListingAiJson,
  parseSourceWebsite,
  sameOriginStylesheetUrls,
} from "@/lib/listing-ai";
import { keepLoginNextPath, listingOwnerAppPath, safeAppPath } from "@/lib/app-path";

const html = `
<html>
  <head>
    <title>PlayTours | Games</title>
    <meta property="og:description" content="Run your own games." />
  </head>
  <body>
    <a href="mailto:hello@playtours.app">email</a>
    <a href="https://instagram.com/playtours">ig</a>
    <a href="https://wa.me/6591234567">whatsapp</a>
    <p>UEN 202140869R PLAYTOURS PTE. LTD. 12 Tai Seng</p>
  </body>
</html>
`;

describe("listing AI draft", () => {
  it("rejects private or non-https websites", () => {
    expect(() => parseSourceWebsite("ftp://example.sg")).toThrow(LISTING_AI_BAD_URL);
    expect(() => parseSourceWebsite("https://localhost/app")).toThrow(LISTING_AI_BAD_URL);
    expect(isBlockedHostname("127.0.0.1")).toBe(true);
    expect(isBlockedHostname("192.168.1.8")).toBe(true);
    expect(parseSourceWebsite("playtours.app")).toBe("https://playtours.app/");
  });

  it("reads brand, email, WhatsApp, UEN, and social links from HTML", () => {
    const hints = extractPageHints(html, "https://playtours.app/");
    expect(hints.title).toContain("PlayTours");
    expect(hints.emails).toContain("hello@playtours.app");
    expect(hints.phones[0]).toBe("6591234567");
    expect(hints.uens).toContain("202140869R");
    expect(hints.links.instagram).toContain("instagram.com/playtours");
    const draft = heuristicListingDraft(hints, ["https://example.com/a.jpg"], "https://playtours.app/");
    expect(draft.brandName).toBe("PlayTours");
    expect(draft.uen).toBe("202140869R");
    expect(draft.photos).toEqual(["https://example.com/a.jpg"]);
  });

  it("does not invent a UEN the page never showed", () => {
    const hints = extractPageHints("<title>Shop</title>", "https://shop.sg/");
    const draft = parseListingAiJson(
      { brandName: "Shop", uen: "201111111A" },
      hints,
      [],
      "https://shop.sg/",
    );
    expect(draft.uen).toBe("");
    expect(draft.brandName).toBe("Shop");
  });

  it("only allows in-app next paths after sign-in", () => {
    expect(safeAppPath("/app/businesses/abc")).toBe("/app/businesses/abc");
    expect(safeAppPath("https://evil.example/app")).toBeNull();
    expect(safeAppPath("/login")).toBeNull();
  });

  it("keeps an unexpired listing invite path when a new sign-in code is requested", () => {
    const now = Date.parse("2026-09-20T08:00:00.000Z");
    expect(
      keepLoginNextPath(
        { nextPath: "/app/businesses/abc", expiresAt: "2026-09-27T08:00:00.000Z" },
        undefined,
        now,
      ),
    ).toBe("/app/businesses/abc");
    expect(
      keepLoginNextPath(
        { nextPath: "/app/businesses/abc", expiresAt: "2026-09-19T08:00:00.000Z" },
        undefined,
        now,
      ),
    ).toBeNull();
    expect(
      keepLoginNextPath(
        { nextPath: "/app/businesses/old", expiresAt: "2026-09-27T08:00:00.000Z" },
        "/app/businesses/new",
        now,
      ),
    ).toBe("/app/businesses/new");
    expect(listingOwnerAppPath("abc-def")).toBe("/app/businesses/abc-def");
    expect(safeAppPath(listingOwnerAppPath("abc-def"))).toBe("/app/businesses/abc-def");
  });

  it("treats uploaded photos as listing photos when there is no website", () => {
    const draft = emptyListingAiDraft(["https://example.com/shop.jpg"]);
    expect(draft.photos).toEqual(["https://example.com/shop.jpg"]);
    expect(draft.brandName).toBe("");
    expect(draft.uen).toBe("");
    expect(draft.primaryColor).toBe("");
    expect(draft.secondaryColor).toBe("");
  });

  it("can fill brand, UEN, and colours read from photos", () => {
    const hints = extractPageHints("<title></title>", "https://example.sg/");
    const draft = parseListingAiJson(
      {
        brandName: "Easy Bottles",
        uen: "202140869R",
        summary: "Ready-to-drink bottles.",
        primaryColor: "#e11d48",
        secondaryColor: "#f59e0b",
      },
      hints,
      ["https://example.com/poster.jpg"],
      "",
    );
    expect(draft.brandName).toBe("Easy Bottles");
    expect(draft.uen).toBe("202140869R");
    expect(draft.photos).toEqual(["https://example.com/poster.jpg"]);
    expect(draft.primaryColor).toBe("#e11d48");
    expect(draft.secondaryColor).toBe("#f59e0b");
  });

  it("copies brand colours from the page and ignores colours the page never used", () => {
    const page = `
      <html>
        <head>
          <title>PlayTours</title>
          <meta name="theme-color" content="#5B21B6" />
          <link rel="stylesheet" href="/assets/app.css" />
          <style>:root { --accent: #f59e0b; }</style>
        </head>
      </html>
    `;
    const hints = extractPageHints(page, "https://playtours.app/");
    expect(hints.themeColor).toBe("#5b21b6");
    expect(sameOriginStylesheetUrls(page, "https://playtours.app/")).toEqual([
      "https://playtours.app/assets/app.css",
    ]);
    const draft = parseListingAiJson(
      { brandName: "PlayTours", primaryColor: "#ff00ff", secondaryColor: "#f59e0b" },
      hints,
      [],
      "https://playtours.app/",
    );
    expect(draft.primaryColor).toBe("#5b21b6");
    expect(draft.secondaryColor).toBe("#f59e0b");
  });
});
