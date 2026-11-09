import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { randomUUID } from "crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { sqlClient } from "@/lib/db/client";

export class ApiKeyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ApiKeyRole = "admin" | "owner";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  role: ApiKeyRole;
  uid: string;
  email: string;
  createdAt: string;
  createdBy: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type PublicApiKey = Omit<ApiKeyRecord, "keyHash">;

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newApiToken() {
  return `mosg_${randomBytes(24).toString("hex")}`;
}

export function apiKeyPrefix(token: string) {
  return `${token.slice(0, 12)}…`;
}

export function keyCreateAllowed(input: { actorIsAdmin: boolean; role: ApiKeyRole }) {
  if (input.role === "admin") return input.actorIsAdmin;
  return true;
}

export function keyRevokeAllowed(input: {
  actorIsAdmin: boolean;
  actorUid: string;
  keyUid: string;
}) {
  return input.actorIsAdmin || input.actorUid === input.keyUid;
}

function asKey(id: string, data: Record<string, unknown>): ApiKeyRecord {
  return {
    id,
    name: String(data.name || ""),
    keyHash: String(data.keyHash || ""),
    prefix: String(data.prefix || ""),
    role: data.role === "admin" ? "admin" : "owner",
    uid: String(data.uid || ""),
    email: String(data.email || ""),
    createdAt: String(data.createdAt || ""),
    createdBy: String(data.createdBy || ""),
    revokedAt: data.revokedAt ? String(data.revokedAt) : null,
    lastUsedAt: data.lastUsedAt ? String(data.lastUsedAt) : null,
  };
}

export function publicApiKey(key: ApiKeyRecord): PublicApiKey {
  const { keyHash: _hash, ...rest } = key;
  return rest;
}

export async function userByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const sql = await sqlClient();
  const rows = await sql.unsafe(
    `select id, email, name from "user" where lower(email) = $1 limit 1`,
    [normalized],
  );
  const row = rows[0];
  if (!row?.id || !row.email) return null;
  return {
    uid: String(row.id),
    email: String(row.email).trim().toLowerCase(),
    name: row.name ? String(row.name) : null,
  };
}

export async function createApiKey(input: {
  name: string;
  role: ApiKeyRole;
  uid: string;
  email: string;
  createdBy: string;
}) {
  const token = newApiToken();
  const id = randomUUID();
  const record: ApiKeyRecord = {
    id,
    name: input.name.trim().slice(0, 80) || "API key",
    keyHash: hashApiToken(token),
    prefix: apiKeyPrefix(token),
    role: input.role,
    uid: input.uid,
    email: input.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    revokedAt: null,
    lastUsedAt: null,
  };
  const { db } = initAdmin();
  await db.collection("apiKeys").doc(id).set(record);
  return { token, key: publicApiKey(record) };
}

export async function listApiKeys(actor: { uid: string; isAdmin: boolean }) {
  const { db } = initAdmin();
  const snap = actor.isAdmin
    ? await db.collection("apiKeys").get()
    : await db.collection("apiKeys").where("uid", "==", actor.uid).get();
  return snap.docs
    .map((doc) => publicApiKey(asKey(doc.id, doc.data() || {})))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeApiKey(id: string, actor: { uid: string; isAdmin: boolean }) {
  const { db } = initAdmin();
  const ref = db.collection("apiKeys").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiKeyError(404, "API key not found.");
  const key = asKey(snap.id, snap.data() || {});
  if (!keyRevokeAllowed({ actorIsAdmin: actor.isAdmin, actorUid: actor.uid, keyUid: key.uid })) {
    throw new ApiKeyError(403, "You cannot revoke this API key.");
  }
  if (key.revokedAt) return publicApiKey(key);
  const revokedAt = new Date().toISOString();
  await ref.set({ revokedAt }, { merge: true });
  return publicApiKey({ ...key, revokedAt });
}

export async function authenticateApiKey(token: string) {
  if (!token.startsWith("mosg_")) return null;
  const { db } = initAdmin();
  const snap = await db.collection("apiKeys").where("keyHash", "==", hashApiToken(token)).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const key = asKey(doc.id, doc.data() || {});
  const expected = Buffer.from(key.keyHash);
  const actual = Buffer.from(hashApiToken(token));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  if (key.revokedAt || !key.uid || !key.email) return null;
  const lastUsedAt = new Date().toISOString();
  await doc.ref.set({ lastUsedAt }, { merge: true }).catch(() => undefined);
  return { ...key, lastUsedAt };
}
