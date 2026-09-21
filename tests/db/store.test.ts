import { randomUUID } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";

process.env.USE_PGLITE = "1";
process.env.BETTER_AUTH_SECRET = "test-secret";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

describe("neon document store", () => {
  beforeAll(async () => {
    await import("../../src/lib/db/client").then((mod) => mod.sqlClient());
  });

  it("hides pending listings from live queries and keeps analytics private to the API", async () => {
    const { initAdmin } = await import("../../src/lib/firebase/admin");
    const { getLiveBusinesses } = await import("../../src/lib/data");
    const { db } = initAdmin();
    await db.collection("businesses").doc("live-1").set({
      status: "live",
      brandName: "Live Warong",
      ownerId: "owner-1",
      slug: "live-warong",
      uen: "200000001A",
      registeredName: "Live Warong Pte Ltd",
      contactEmail: "live@example.com",
      summary: "",
      description: "",
      urls: [],
      tagIds: [],
      photos: [],
      lat: null,
      lng: null,
      address: "",
      lastAdminNote: null,
      verificationType: "linkedin",
      linkedinUrl: "https://linkedin.com/in/example",
      uenDownloadedAt: null,
      lastConfirmedAt: null,
      confirmationDueAt: null,
      lastReminderAt: null,
      termsAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      is_demo: false,
      foundingSlot: null,
      featuredUntil: null,
      whatsapp: null,
      whatsappTemplate: null,
      primaryColor: null,
      secondaryColor: null,
    });
    await db.collection("businesses").doc("pending-1").set({
      status: "pending_review",
      brandName: "Pending Warong",
      ownerId: "owner-1",
      slug: "pending-warong",
      uen: "200000002B",
      registeredName: "Pending Warong Pte Ltd",
      contactEmail: "pending@example.com",
      summary: "",
      description: "",
      urls: [],
      tagIds: [],
      photos: [],
      lat: null,
      lng: null,
      address: "",
      lastAdminNote: null,
      verificationType: "linkedin",
      linkedinUrl: "https://linkedin.com/in/example",
      uenDownloadedAt: null,
      lastConfirmedAt: null,
      confirmationDueAt: null,
      lastReminderAt: null,
      termsAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      is_demo: false,
      foundingSlot: null,
      featuredUntil: null,
      whatsapp: null,
      whatsappTemplate: null,
      primaryColor: null,
      secondaryColor: null,
    });
    await db.collection("listing_stats").doc("live-1").set({ uniqueViews: 3, uniqueImpressions: 0, clicks: 0 });

    const live = await getLiveBusinesses();
    expect(live.map((row) => row.id)).toEqual(["live-1"]);
    expect(live.some((row) => row.id === "pending-1")).toBe(false);

    const stats = await db.collection("listing_stats").doc("live-1").get();
    expect(stats.data()?.uniqueViews).toBe(3);
  });

  it("stores private files without a public flag", async () => {
    const { getBucket, readFileRecord } = await import("../../src/lib/db/files");
    const path = `uen/${randomUUID()}.pdf`;
    await getBucket().file(path).save(Buffer.from("%PDF-test"), {
      contentType: "application/pdf",
      metadata: { cacheControl: "private" },
    });
    const file = await readFileRecord(path);
    expect(file?.isPublic).toBe(false);
    expect(file?.contentType).toBe("application/pdf");
  });
});
