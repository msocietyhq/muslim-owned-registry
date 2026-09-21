import { describe, expect, it } from "vitest";
import {
  historyAuthorIdentity,
  historyAuthorPhrase,
  listingHistoryView,
  shouldWriteHistory,
  snapshotDiffs,
  snapshotsMatch,
  type HistoryDiffCopy,
} from "@/lib/history-display";

const authorCopy = {
  byAdmin: "by admin {author}",
  byOwner: "by the listing owner {author}",
  bySystem: "by muslimowned.sg",
  byLink: "via an email confirmation link",
  byUnknown: "by {author}",
};

const diffCopy: HistoryDiffCopy = {
  historyChange: "{field}: {from} → {to}",
  historyBlank: "blank",
  historyPhotosCount: "{n} photos",
  historyPhotosOne: "1 photo",
  historyPhotosNone: "no photos",
  historyPhotosReplaced: "{n} photos (different files)",
  historyUrlsNone: "none",
  historyTagsNone: "none",
  historyMapOnline: "listed as online",
  historyVerificationUen: "UEN document",
  historyVerificationLinkedin: "LinkedIn",
  historyFields: {
    brandName: "Brand name",
    registeredName: "Registered company name",
    uen: "UEN",
    slug: "Page link",
    contactEmail: "Contact email",
    whatsapp: "WhatsApp number",
    whatsappTemplate: "WhatsApp message",
    summary: "Introduction",
    description: "Description",
    urls: "Websites and profiles",
    tags: "Tags",
    photos: "Photos",
    address: "Street address",
    mapPin: "Map pin",
    status: "Public status",
        verificationType: "Verification",
        linkedinUrl: "LinkedIn",
        primaryColor: "Primary colour",
        secondaryColor: "Secondary colour",
      },
};

const ctx = {
  copy: diffCopy,
  statusLabels: {
    live: "Published",
    pending_review: "Waiting for review",
  },
  tagNames: new Map([
    ["food", "Food"],
    ["events", "Events"],
  ]),
};

describe("history author", () => {
  it("names the admin with email so the change is traceable", () => {
    expect(
      historyAuthorIdentity({
        actorRole: "admin",
        actorName: "Afiq",
        actorEmail: "afiq980@gmail.com",
        actorId: "admin-uid",
      }),
    ).toEqual({
      role: "admin",
      author: "Afiq (afiq980@gmail.com)",
    });
    expect(
      historyAuthorPhrase(
        {
          actorRole: "admin",
          actorEmail: "afiq980@gmail.com",
          actorName: "Afiq",
        },
        authorCopy,
      ),
    ).toBe("by admin Afiq (afiq980@gmail.com)");
  });

  it("names the listing owner separately from admins", () => {
    expect(
      historyAuthorPhrase(
        {
          actorRole: "owner",
          actorName: "Makcik Cakes",
          actorEmail: "owner@example.sg",
        },
        authorCopy,
      ),
    ).toBe("by the listing owner Makcik Cakes (owner@example.sg)");
  });

  it("hides editor emails on the public listing", () => {
    expect(
      historyAuthorPhrase(
        {
          actorRole: "owner",
          actorName: "Mohamed Afiq",
          actorEmail: "afiq980@gmail.com",
        },
        authorCopy,
        { hideEmail: true },
      ),
    ).toBe("by the listing owner Mohamed Afiq");
    expect(
      historyAuthorPhrase(
        {
          actorRole: "admin",
          actorEmail: "afiq980@gmail.com",
        },
        authorCopy,
        { hideEmail: true },
      ),
    ).toBe("by admin");
    expect(
      historyAuthorIdentity(
        {
          actorRole: "owner",
          actorName: "afiq980@gmail.com",
          actorEmail: "afiq980@gmail.com",
        },
        { hideEmail: true },
      ).author,
    ).toBe("");
  });

  it("labels system and email-link updates", () => {
    expect(historyAuthorPhrase({ actorRole: "system", actorId: "system" }, authorCopy)).toBe(
      "by muslimowned.sg",
    );
    expect(historyAuthorPhrase({ actorRole: "listing-link", actorId: "listing-link" }, authorCopy)).toBe(
      "via an email confirmation link",
    );
  });
});

describe("history snapshot diffs", () => {
  it("treats a save that only bumps updatedAt as unchanged", () => {
    const previous = { brandName: "PlayTours", status: "live", updatedAt: "2026-09-20T05:51:35.000Z" };
    const next = { brandName: "PlayTours", status: "live", updatedAt: "2026-09-20T05:51:46.000Z" };
    expect(snapshotsMatch(previous, next)).toBe(true);
    expect(shouldWriteHistory("update", previous, next)).toBe(false);
    expect(snapshotDiffs(previous, next, ctx)).toEqual([]);
  });

  it("still writes create rows and real field edits", () => {
    const previous = { brandName: "PlayTours", summary: "Old" };
    const next = { brandName: "PlayTours", summary: "New intro" };
    expect(shouldWriteHistory("create", previous, next)).toBe(true);
    expect(shouldWriteHistory("update", previous, next)).toBe(true);
    expect(snapshotDiffs(previous, next, ctx).map((item) => item.line)).toEqual([
      "Introduction: Old → New intro",
    ]);
  });

  it("says exactly what changed, including status and tags", () => {
    const diffs = snapshotDiffs(
      {
        brandName: "Play",
        status: "pending_review",
        tagIds: ["food"],
        whatsapp: null,
        urls: [],
        photos: ["a.jpg"],
        lat: 1.3,
        lng: 103.8,
      },
      {
        brandName: "PlayTours",
        status: "live",
        tagIds: ["food", "events"],
        whatsapp: "6591234567",
        urls: [{ label: "Website", url: "https://playtours.sg" }],
        photos: ["a.jpg", "b.jpg"],
        lat: null,
        lng: null,
      },
      ctx,
    );
    expect(diffs.map((item) => item.line)).toEqual([
      "Brand name: Play → PlayTours",
      "WhatsApp number: blank → +65 9123 4567",
      "Websites and profiles: none → Website (https://playtours.sg)",
      "Tags: Food → Food, Events",
      "Photos: 1 photo → 2 photos",
      "Map pin: 1.30000, 103.80000 → listed as online",
      "Public status: Waiting for review → Published",
    ]);
  });

  it("hides repeated no-op owner saves on the public listing", () => {
    const created = { status: "pending_review", brandName: "PlayTours", updatedAt: "t0" };
    const published = { status: "live", brandName: "PlayTours", updatedAt: "t1" };
    const save1 = { status: "live", brandName: "PlayTours", updatedAt: "t2" };
    const save2 = { status: "live", brandName: "PlayTours", updatedAt: "t3" };
    const save3 = { status: "live", brandName: "PlayTours", updatedAt: "t4" };
    const view = listingHistoryView(
      [
        { id: "s3", op: "update", createdAt: "t4", snapshot: save3 },
        { id: "s2", op: "update", createdAt: "t3", snapshot: save2 },
        { id: "s1", op: "update", createdAt: "t2", snapshot: save1 },
        { id: "p", op: "update", createdAt: "t1", snapshot: published },
        { id: "c", op: "create", createdAt: "t0", snapshot: created },
      ],
      ctx,
    );
    expect(view.map((item) => item.id)).toEqual(["p", "c"]);
    expect(view[0]?.diffs.map((item) => item.line)).toEqual([
      "Public status: Waiting for review → Published",
    ]);
  });
});
