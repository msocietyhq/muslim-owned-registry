import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeApp as initAdmin, getApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8088";
process.env.FIREBASE_PROJECT_ID = "demo-muslimowned-sg";

describe("firestore rules via emulator", () => {
  beforeAll(async () => {
    if (!getApps().length) {
      initAdmin({ projectId: "demo-muslimowned-sg" });
    }
    const adminDb = getAdminFirestore();
    await adminDb.doc("businesses/live-1").set({
      status: "live",
      brandName: "Live Warong",
      ownerId: "owner-1",
    });
    await adminDb.doc("businesses/pending-1").set({
      status: "pending_review",
      brandName: "Pending Warong",
      ownerId: "owner-1",
    });
    await adminDb.doc("listing_stats/live-1").set({ uniqueViews: 3 });
    await adminDb.doc("listing_seen/view_live-1_visitor").set({ kind: "view" });
    await adminDb.doc("site_seen/unique_visitor").set({ kind: "unique" });
  });

  afterAll(async () => {
    const adminDb = getAdminFirestore();
    await adminDb.doc("businesses/live-1").delete();
    await adminDb.doc("businesses/pending-1").delete();
    await adminDb.doc("listing_stats/live-1").delete();
    await adminDb.doc("listing_seen/view_live-1_visitor").delete();
    await adminDb.doc("site_seen/unique_visitor").delete();
  });

  it("lets visitors read live listings and hides pending ones", async () => {
    const app = initializeApp(
      { projectId: "demo-muslimowned-sg", apiKey: "demo-api-key" },
      "rules-client",
    );
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8088);

    const live = await getDoc(doc(db, "businesses", "live-1"));
    expect(live.exists()).toBe(true);

    await expect(getDoc(doc(db, "businesses", "pending-1"))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("hides listing analytics from the client", async () => {
    const app = initializeApp(
      { projectId: "demo-muslimowned-sg", apiKey: "demo-api-key" },
      "rules-analytics-client",
    );
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8088);

    await expect(getDoc(doc(db, "listing_stats", "live-1"))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(getDoc(doc(db, "listing_seen", "view_live-1_visitor"))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(getDoc(doc(db, "site_seen", "unique_visitor"))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
