import { asBusiness, toBusinessDoc } from "../src/lib/data";
import { FOUNDING_STATS_DOC, planFoundingBackfill } from "../src/lib/founding";

if (process.env.FIREBASE_USE_EMULATOR === "0") {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIREBASE_PROJECT_ID ||= "muslimownedsg-d04cb";
} else {
  process.env.FIREBASE_USE_EMULATOR ||= "1";
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8088";
  process.env.FIREBASE_PROJECT_ID ||= "demo-muslimowned-sg";
}

async function useCliCredentials(projectId: string) {
  const { getGlobalDefaultAccount } = await import("firebase-tools/lib/auth.js");
  const { getCredentialPathAsync } = await import("firebase-tools/lib/defaultCredentials.js");
  const { applicationDefault, getApps, initializeApp } = await import("firebase-admin/app");
  const account = getGlobalDefaultAccount();
  if (!account) {
    throw new Error("Firebase CLI is not logged in. Run: firebase login");
  }
  const credPath = await getCredentialPathAsync(account);
  if (!credPath) {
    throw new Error("Could not write application default credentials from the Firebase CLI login.");
  }
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  if (!getApps().length) {
    initializeApp({
      projectId,
      credential: applicationDefault(),
    });
  }
}

async function main() {
  if (process.env.FIREBASE_USE_EMULATOR === "0") {
    await useCliCredentials(process.env.FIREBASE_PROJECT_ID || "muslimownedsg-d04cb");
  }

  const { initAdmin } = await import("../src/lib/firebase/admin");
  const { db } = initAdmin();
  const snap = await db.collection("businesses").get();
  const businesses = snap.docs.map((doc) => asBusiness(doc.id, doc.data()));
  const plan = planFoundingBackfill(businesses);
  const now = new Date().toISOString();

  for (const row of plan.updates) {
    const current = businesses.find((business) => business.id === row.id);
    if (!current) continue;
    const next = {
      ...current,
      foundingSlot: row.foundingSlot,
      featuredUntil: row.featuredUntil,
      updatedAt: now,
    };
    await db.collection("businesses").doc(row.id).set(toBusinessDoc(next), { merge: true });
  }

  await db.doc(FOUNDING_STATS_DOC).set(
    { claimed: plan.claimed, updatedAt: now },
    { merge: true },
  );

  console.log(
    `Founding backfill: ${plan.updates.length} listings updated, claimed=${plan.claimed}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
