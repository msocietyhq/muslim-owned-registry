import { describe, expect, it } from "vitest";
import { safeSessionPath } from "@/lib/app-path";
import { hasRepeatedPath, looksLikeIncompleteWork, parseAgentAction } from "@/lib/seo-geo/agent";
import { cacheExpiresAt, cacheIsFresh, SEO_GEO_CACHE_DAYS } from "@/lib/seo-geo/cache";
import {
  messagesRemaining,
  recentMessageTimes,
  seoGeoAgentRounds,
  seoGeoCapsOff,
  seoGeoUnlimited,
  SEO_GEO_RUNAWAY_ROUNDS,
} from "@/lib/seo-geo/config";
import {
  eligibleDomains,
  isSocialHost,
  matchEligibleDomain,
  websiteHost,
} from "@/lib/seo-geo/domains";
import { pageIsOnDomain, pageKey, sitemapLocs, suggestRealPages } from "@/lib/seo-geo/fetch-site";
import { parseQuestions, parseReport, ensureQuestionMix, marketsFromAnswers } from "@/lib/seo-geo/flow";
import { reportDocx, reportPdf } from "@/lib/seo-geo/office";
import { siteChatId, uniqueChatsByDomain } from "@/lib/seo-geo/ids";
import { applyJourney, emptyJourney, journeyView } from "@/lib/seo-geo/journey";
import { parseInline, parseMarkdown, safeHref } from "@/lib/seo-geo/markdown";
import { redactVendorNames } from "@/lib/seo-geo/redact";
import type { Business } from "@/lib/types";

function business(patch: Partial<Business>): Business {
  return {
    id: "biz",
    ownerId: "owner",
    uen: "12345678A",
    registeredName: "Example Pte. Ltd.",
    brandName: "Example",
    slug: "example",
    contactEmail: "hi@example.com",
    whatsapp: null,
    whatsappTemplate: null,
    summary: "",
    description: "",
    urls: [],
    tagIds: [],
    photos: [],
    lat: null,
    lng: null,
    address: "",
    lastAdminNote: null,
    status: "live",
    verificationType: "uen_document",
    linkedinUrl: null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    termsAcceptedAt: "2026-09-20",
    createdAt: "2026-09-20",
    updatedAt: "2026-09-20",
    isDemo: false,
    foundingSlot: null,
    featuredUntil: null,
    primaryColor: null,
    secondaryColor: null,
    ...patch,
  };
}

describe("seo geo domains", () => {
  it("accepts a company host and rejects social hosts", () => {
    expect(websiteHost("https://www.playtours.app/about")).toBe("playtours.app");
    expect(isSocialHost("instagram.com")).toBe(true);
    expect(isSocialHost("m.facebook.com")).toBe(true);
    expect(isSocialHost("playtours.app")).toBe(false);
  });

  it("only offers websites on live non-demo listings", () => {
    const rows = eligibleDomains([
      business({
        urls: [
          { url: "https://playtours.app", label: "Website" },
          { url: "https://instagram.com/playtours", label: "Instagram" },
        ],
      }),
      business({ id: "pending", status: "pending_review", urls: [{ url: "https://other.sg", label: "Website" }] }),
      business({ id: "demo", isDemo: true, urls: [{ url: "https://demo.sg", label: "Website" }] }),
    ]);
    expect(rows.map((row) => row.domain)).toEqual(["playtours.app"]);
    expect(matchEligibleDomain("www.playtours.app", rows).ok).toBe(true);
    expect(matchEligibleDomain("instagram.com/playtours", rows).ok).toBe(false);
    expect(matchEligibleDomain("other.sg", rows).ok).toBe(false);
  });
});

describe("seo geo safety", () => {
  it("removes vendor names without touching nearby words", () => {
    expect(redactVendorNames("Ask Mole at Synscribe, not a molecule.")).toBe(
      "Ask assistant at, not a molecule.",
    );
  });

  it("counts only messages inside the last hour", () => {
    const now = Date.parse("2026-09-29T10:00:00.000Z");
    const times = [
      "2026-09-29T09:30:00.000Z",
      "2026-09-29T08:00:00.000Z",
    ];
    expect(recentMessageTimes(times, now)).toEqual(["2026-09-29T09:30:00.000Z"]);
    expect(messagesRemaining(Array.from({ length: 15 }, () => "2026-09-29T09:50:00.000Z"), now)).toBe(0);
  });

  it("allows a return to the tools page after login", () => {
    expect(safeSessionPath("/tools/seo-geo")).toBe("/tools/seo-geo");
  });

  it("does not cap afiq980, and caps are off while testing", () => {
    expect(seoGeoUnlimited("afiq980@gmail.com")).toBe(true);
    expect(seoGeoUnlimited("Afiq980@gmail.com")).toBe(true);
    expect(seoGeoUnlimited("someone@example.com")).toBe(false);
    expect(seoGeoCapsOff("afiq980@gmail.com")).toBe(true);
    expect(seoGeoCapsOff("someone@example.com")).toBe(true);
    expect(seoGeoAgentRounds("afiq980@gmail.com")).toBe(SEO_GEO_RUNAWAY_ROUNDS);
  });

  it("keeps a saved copy for 15 days", () => {
    const now = Date.parse("2026-09-29T00:00:00.000Z");
    const expires = cacheExpiresAt(now);
    expect(SEO_GEO_CACHE_DAYS).toBe(15);
    expect(expires).toBe("2026-10-14T00:00:00.000Z");
    expect(cacheIsFresh(expires, now + 14 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(cacheIsFresh(expires, now + 15 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});

describe("seo geo chat shape", () => {
  it("keeps one chat id per owner and domain", () => {
    expect(siteChatId("owner-1", "playtours.app")).toBe("site:owner-1:playtours.app");
  });

  it("keeps the newest chat when the same domain appears twice", () => {
    const rows = uniqueChatsByDomain([
      { domain: "a.sg", updatedAt: "2026-09-29T10:00:00.000Z", id: "old" },
      { domain: "a.sg", updatedAt: "2026-09-29T11:00:00.000Z", id: "new" },
      { domain: "b.sg", updatedAt: "2026-09-29T09:00:00.000Z", id: "b" },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["new", "b"]);
  });
});

describe("seo geo journey", () => {
  it("marks the current step without listing it as done", () => {
    const next = applyJourney(emptyJourney(), { current: "keywords", done: ["buyer", "keywords"] });
    expect(next).toEqual({ current: "keywords", done: ["buyer"] });
    expect(journeyView(next).map((step) => step.status).slice(0, 3)).toEqual(["done", "now", "todo"]);
  });
});

describe("seo geo markdown", () => {
  it("parses headings, lists, and links without a third-party renderer", () => {
    const blocks = parseMarkdown("## Next\n- Check **title**\n1. Publish\n[Open](https://playtours.app)");
    expect(blocks[0]).toEqual({ type: "h", level: 2, text: "Next" });
    expect(blocks[1]).toEqual({ type: "ul", items: ["Check **title**"] });
    expect(blocks[2]).toEqual({ type: "ol", items: ["Publish"] });
    expect(parseInline("[Open](https://playtours.app)")).toEqual([
      { type: "a", href: "https://playtours.app", children: [{ type: "text", text: "Open" }] },
    ]);
    expect(safeHref("javascript:alert(1)")).toBeNull();
  });
});

describe("seo geo agent", () => {
  it("requires JSON tools and rejects homework-style replies", () => {
    expect(parseAgentAction('```json\n{"tool":"fetch_page","url":"https://playtours.app/"}\n```')).toEqual({
      ok: true,
      tool: "fetch_page",
      url: "https://playtours.app/",
    });
    expect(parseAgentAction("I'll start by fetching the page and checking Google.")).toEqual({
      ok: false,
      error: "Reply must be a JSON tool object.",
    });
    expect(
      parseAgentAction(
        JSON.stringify({
          tool: "done",
          markdown: "Open your Goosechase page and ask: Does the title say what the page is about?",
        }),
      ).ok,
    ).toBe(false);
    expect(looksLikeIncompleteWork("I'll start by fetching the page.")).toBe(true);
    expect(pageIsOnDomain("playtours.app", "https://www.playtours.app/blog")).toBe(true);
    expect(pageIsOnDomain("playtours.app", "https://evil.example/")).toBe(false);
    expect(
      hasRepeatedPath(
        "https://playtours.app/guides/goosechase-alternative-singapore-2026-singapore-singapore-singapore",
      ),
    ).toBe(true);
    expect(hasRepeatedPath("https://playtours.app/guides/goosechase-alternative-singapore")).toBe(false);
    expect(pageKey("https://www.playtours.app/guides/goosechase/") ).toBe("playtours.app/guides/goosechase");
    expect(
      sitemapLocs("<url><loc>https://www.playtours.app/guides/goosechase</loc></url>"),
    ).toEqual(["https://www.playtours.app/guides/goosechase"]);
    expect(
      suggestRealPages(
        "https://playtours.app/guides/goosechase-alternative-singapore-singapore-singapore",
        ["https://playtours.app/guides/goosechase", "https://playtours.app/pricing"],
        1,
      )[0],
    ).toBe("https://playtours.app/guides/goosechase");
  });
});

describe("seo geo report", () => {
  it("builds questions and a course-shaped report that can be downloaded", () => {
    const questions = parseQuestions(
      JSON.stringify({
        questions: [
          { id: "markets", kind: "multi", prompt: "Which markets?", options: ["Singapore", "Malaysia"] },
          { kind: "text", prompt: "Who buys?" },
        ],
      }),
    );
    expect(questions.map((item) => item.kind)).toEqual(["multi", "text"]);
    const mixed = ensureQuestionMix(questions.filter((question) => question.kind !== "text"));
    expect(mixed.some((question) => question.kind === "text")).toBe(true);
    expect(marketsFromAnswers([{ id: "markets", value: ["Worldwide", "USA"] }]).map((market) => market.code)).toEqual([
      2840,
    ]);
    expect(marketsFromAnswers([{ id: "markets", value: ["Singapore", "Australia"] }]).map((market) => market.label)).toEqual([
      "Singapore",
      "Australia",
    ]);
    const report = parseReport(
      JSON.stringify({
        title: "PlayTours",
        summary: "Start with the buyer, then one page.",
        sections: [{ heading: "Know your business, know your buyer", points: ["Teams booking a game."] }],
        todos: [{ month: "Month 1", title: "Publish one page", detail: "Match one keyword." }],
      }),
      { fetchedAt: "", location: "Singapore", total: 1, error: null, keywords: [{ keyword: "goosechase", volume: 210, position: 6 }] },
    );
    expect(report?.sections.map((section) => section.heading)).toContain("Indexing");
    expect(report?.sections.find((section) => section.heading.startsWith("Know your"))?.points[0]).toContain("Teams");
    expect(report?.todos[0]?.month).toBe("Month 1");
    expect(report?.charts.map((chart) => chart.title)).toEqual([
      "Singapore search volume",
      "Singapore Google position",
    ]);
    expect(reportDocx(report!).subarray(0, 2).toString()).toBe("PK");
    expect(reportPdf(report!).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
