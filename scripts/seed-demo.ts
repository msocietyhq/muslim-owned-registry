import { demoBusinesses, demoOwners, demoTags } from "../src/lib/demo-listings";
import { toBusinessDoc } from "../src/lib/data";

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
  const businesses = demoBusinesses();
  if (businesses.length !== 50) {
    throw new Error(`Expected 50 demo businesses, got ${businesses.length}.`);
  }

  if (process.env.FIREBASE_USE_EMULATOR === "0") {
    await useCliCredentials(process.env.FIREBASE_PROJECT_ID || "muslimownedsg-d04cb");
  }

  const { initAdmin } = await import("../src/lib/firebase/admin");
  const { writeHistory } = await import("../src/lib/history");
  const { db } = initAdmin();

  for (const tag of demoTags()) {
    await db.collection("tags").doc(tag.id).set(tag);
  }

  for (const owner of demoOwners()) {
    await db.collection("owners").doc(owner.id).set(owner);
  }

  for (const business of businesses) {
    await db.collection("businesses").doc(business.id).set(toBusinessDoc(business));
    await writeHistory("businesses", business.id, "create", toBusinessDoc(business), {
      id: business.ownerId,
      email: null,
      name: null,
      role: "owner",
    });
  }

  console.log(`Seeded ${businesses.length} demo businesses (is_demo=true).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
