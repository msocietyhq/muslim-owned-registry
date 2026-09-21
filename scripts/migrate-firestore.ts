/**
 * One-shot copy of Firestore collections + Storage objects into Neon.
 * Uses `firebase login` (CLI token) over REST — Admin SDK needs a service account.
 *
 *   npx tsx scripts/migrate-firestore.ts
 */
import { firestoreStore } from "../src/lib/db/documents";
import { getBucket } from "../src/lib/db/files";
import { getDb } from "../src/lib/db/client";
import { user as userTable } from "../src/lib/db/schema";

const PROJECT_ID = "muslimownedsg-d04cb";
const BUCKETS = ["muslimownedsg-d04cb.firebasestorage.app", "muslimownedsg-d04cb.appspot.com"];

const COLLECTIONS = [
  "owners",
  "businesses",
  "tags",
  "verifications",
  "adminTasks",
  "admins",
  "loginChallenges",
  "listingDrafts",
  "listQuickPending",
  "listQuickChallenges",
  "listing_stats",
  "listing_seen",
  "site_seen",
  "stats",
  "listingLinks",
  "teamMembers",
  "owners_history",
  "businesses_history",
  "verifications_history",
  "admins_history",
  "tags_history",
];

function cliAccessTokenFactory() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require("firebase-tools/lib/auth") as {
    getGlobalDefaultAccount: () => { tokens?: { refresh_token?: string } } | undefined;
    setRefreshToken: (token: string) => void;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const apiv2 = require("firebase-tools/lib/apiv2") as {
    getAccessToken: () => Promise<string>;
  };
  const account = auth.getGlobalDefaultAccount();
  const refresh = account?.tokens?.refresh_token;
  if (!refresh) {
    throw new Error("Firebase CLI is not logged in. Run `firebase login` then retry.");
  }
  auth.setRefreshToken(refresh);
  return () => apiv2.getAccessToken();
}

function decodeValue(value: Record<string, unknown> | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: Record<string, unknown>[] })?.values || [];
    return values.map((item) => decodeValue(item));
  }
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields || {};
    return decodeFields(fields);
  }
  return null;
}

function decodeFields(fields: Record<string, Record<string, unknown>> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(fields || {})) {
    out[key] = decodeValue(nested);
  }
  return out;
}

async function restJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${text.slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function listDocuments(collection: string, token: string) {
  const docs: { id: string; data: Record<string, unknown> }[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ pageSize: "300" });
    if (pageToken) params.set("pageToken", pageToken);
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?${params}`;
    const body = await restJson(url, token);
    const documents = (body.documents as { name?: string; fields?: Record<string, Record<string, unknown>> }[]) || [];
    for (const doc of documents) {
      const id = String(doc.name || "").split("/").pop() || "";
      if (!id) continue;
      docs.push({ id, data: decodeFields(doc.fields) });
    }
    pageToken = String(body.nextPageToken || "");
  } while (pageToken);
  return docs;
}

async function listStorage(token: string) {
  let lastError = "";
  for (const bucket of BUCKETS) {
    const objects: { name: string; contentType: string; bucket: string }[] = [];
    let pageToken = "";
    try {
      do {
        const params = new URLSearchParams({ maxResults: "1000" });
        if (pageToken) params.set("pageToken", pageToken);
        const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`;
        const body = await restJson(url, token);
        const items = (body.items as { name?: string; contentType?: string }[]) || [];
        for (const item of items) {
          if (!item.name) continue;
          objects.push({
            name: item.name,
            contentType: item.contentType || "application/octet-stream",
            bucket,
          });
        }
        pageToken = String(body.nextPageToken || "");
      } while (pageToken);
      return objects;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError || "No Firebase Storage bucket found.");
}

async function downloadObject(bucket: string, name: string, token: string) {
  const url = `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`download ${name}: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function importAuthUsers() {
  const { spawnSync } = await import("child_process");
  const { mkdtempSync, readFileSync, rmSync } = await import("fs");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const dir = mkdtempSync(join(tmpdir(), "mosg-auth-"));
  const file = join(dir, "users.json");
  const result = spawnSync(
    "npx",
    ["firebase", "auth:export", file, "--project", PROJECT_ID, "--format", "json"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(result.stderr || result.stdout || "firebase auth:export failed");
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    users?: {
      localId?: string;
      email?: string;
      displayName?: string;
      emailVerified?: boolean;
      createdAt?: string;
    }[];
  };
  rmSync(dir, { recursive: true, force: true });
  const users = raw.users || [];
  console.log(`auth: ${users.length} users`);
  const db = await getDb();
  for (const account of users) {
    const email = String(account.email || "").trim().toLowerCase();
    const id = String(account.localId || "");
    if (!email || !id) continue;
    await db
      .insert(userTable)
      .values({
        id,
        name: String(account.displayName || email.split("@")[0] || "owner"),
        email,
        emailVerified: Boolean(account.emailVerified),
        createdAt: new Date(Number(account.createdAt || Date.now())),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  delete process.env.FIREBASE_USE_EMULATOR;
  delete process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR;

  const getToken = cliAccessTokenFactory();
  await getDb();

  for (const collection of COLLECTIONS) {
    const token = await getToken();
    const docs = await listDocuments(collection, token);
    console.log(`${collection}: ${docs.length} docs`);
    for (const doc of docs) {
      await firestoreStore.collection(collection).doc(doc.id).set(doc.data);
    }
  }

  await importAuthUsers();

  const files = await listStorage(await getToken());
  console.log(`storage: ${files.length} objects`);
  for (const file of files) {
    const buf = await downloadObject(file.bucket, file.name, await getToken());
    const isPublic =
      file.name.startsWith("listing-photos/") ||
      file.name.startsWith("team-photos/") ||
      file.name.startsWith("list-quick/");
    await getBucket().file(file.name).save(buf, {
      contentType: file.contentType,
      metadata: { cacheControl: isPublic ? "public, max-age=31536000" : "private" },
    });
    if (isPublic) await getBucket().file(file.name).makePublic();
  }

  console.log("Firestore and Storage copy finished.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
