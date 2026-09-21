import { FieldValue, firestoreStore } from "@/lib/db/documents";
import { canReadFirestore } from "@/lib/data";
import { shouldWriteHistory } from "@/lib/history-display";
import type { HistoryActor, HistoryOp } from "@/lib/types";

export function historyActor(
  user: { uid: string; email?: string | null; name?: string | null },
  role: "admin" | "owner",
  name?: string | null,
): HistoryActor {
  const email = user.email?.trim() || null;
  const display = (name || user.name || email || user.uid).trim();
  return {
    id: user.uid,
    email,
    name: display,
    role,
  };
}

export const SYSTEM_ACTOR: HistoryActor = {
  id: "system",
  email: null,
  name: "muslimowned.sg",
  role: "system",
};

export const LISTING_LINK_ACTOR: HistoryActor = {
  id: "listing-link",
  email: null,
  name: "Email confirmation link",
  role: "listing-link",
};

export async function writeHistory(
  collection: string,
  recordId: string,
  op: HistoryOp,
  snapshot: Record<string, unknown>,
  actor: HistoryActor,
) {
  const db = firestoreStore;
  const createdAt = new Date().toISOString();
  await db.collection(`${collection}_history`).add({
    recordId,
    op,
    snapshot,
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role,
    createdAt,
  });
}

/** Skips an update when the public snapshot is unchanged except `updatedAt`. */
export async function writeHistoryUnlessUnchanged(
  collection: string,
  recordId: string,
  op: HistoryOp,
  previous: Record<string, unknown> | null | undefined,
  snapshot: Record<string, unknown>,
  actor: HistoryActor,
) {
  if (!shouldWriteHistory(op, previous, snapshot)) return false;
  await writeHistory(collection, recordId, op, snapshot, actor);
  return true;
}

export async function listHistory(collection: string, recordId: string, limit = 50) {
  if (!(await canReadFirestore())) return [];
  const db = firestoreStore;
  const snap = await db
    .collection(`${collection}_history`)
    .where("recordId", "==", recordId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export const serverTimestamp = FieldValue.serverTimestamp;
