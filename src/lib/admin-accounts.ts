import { adminEmails, initAdmin, isAdminEmail } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";

export const ADMIN_SELF = "You cannot remove your own admin access.";
export const ADMIN_NEED_EMAIL = "Enter the email of the account to change.";

export type AdminAccount = {
  email: string;
  uid: string | null;
  you: boolean;
  canRemove: boolean;
};

type StoredAdmin = {
  email: string;
  admin: boolean;
  uid?: string | null;
};

export function normalizeAdminEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function assertCanSetAdminRole(actorEmail: string, targetEmail: string, makeAdmin: boolean) {
  const actor = normalizeAdminEmail(actorEmail);
  const target = normalizeAdminEmail(targetEmail);
  if (!target || !target.includes("@")) {
    throw new Error(ADMIN_NEED_EMAIL);
  }
  if (!makeAdmin && actor === target) {
    throw new Error(ADMIN_SELF);
  }
  return { actor, target };
}

export function mergeAdminEmails(envEmails: string[], stored: StoredAdmin[]) {
  const map = new Map<string, boolean>();
  for (const email of envEmails) {
    map.set(normalizeAdminEmail(email), true);
  }
  for (const row of stored) {
    map.set(normalizeAdminEmail(row.email), row.admin);
  }
  return [...map.entries()]
    .filter(([, isAdmin]) => isAdmin)
    .map(([email]) => email)
    .sort((a, b) => a.localeCompare(b));
}

export async function accountIsAdmin(email: string | undefined | null) {
  const normalized = normalizeAdminEmail(email || "");
  if (!normalized) return false;
  const { db } = initAdmin();
  const snap = await db.collection("admins").doc(normalized).get();
  if (snap.exists) return snap.data()?.admin === true;
  return isAdminEmail(normalized);
}

export async function listAdminAccounts(actorEmail: string): Promise<AdminAccount[]> {
  const actor = normalizeAdminEmail(actorEmail);
  const { db } = initAdmin();
  const snap = await db.collection("admins").get();
  const stored: StoredAdmin[] = snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      email: normalizeAdminEmail(String(data.email || doc.id)),
      admin: data.admin === true,
      uid: typeof data.uid === "string" ? data.uid : null,
    };
  });
  const emails = mergeAdminEmails(adminEmails(), stored);
  const uidByEmail = new Map(stored.map((row) => [row.email, row.uid || null]));
  return emails.map((email) => {
    const you = email === actor;
    return {
      email,
      uid: uidByEmail.get(email) || null,
      you,
      canRemove: !you,
    };
  });
}

export async function setAdminRole(
  actor: { uid: string; email?: string | null; name?: string | null },
  input: { email: string; admin: boolean; uid?: string | null },
) {
  const actorEmail = normalizeAdminEmail(actor.email || "");
  const { target } = assertCanSetAdminRole(actorEmail, input.email, input.admin);
  const { auth, db } = initAdmin();
  const now = new Date().toISOString();
  const uid = input.uid || null;
  const record = {
    email: target,
    admin: input.admin,
    uid,
    updatedAt: now,
    updatedBy: actorEmail,
  };
  await db.collection("admins").doc(target).set(record, { merge: true });
  if (uid) {
    await auth.setCustomUserClaims(uid, { admin: input.admin });
  }
  await writeHistory(
    "admins",
    target,
    "update",
    { email: target, admin: input.admin },
    historyActor(actor, "admin"),
  );
  return { email: target, admin: input.admin };
}

export async function existingAuthUser(email: string) {
  const { auth } = initAdmin();
  const user = await auth.getUserByEmail(email).catch((error: { code?: string }) => {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  });
  return user ? { uid: user.uid, email } : null;
}
