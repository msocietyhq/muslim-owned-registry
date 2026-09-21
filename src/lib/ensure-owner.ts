import { accountIsAdmin } from "@/lib/admin-accounts";
import { ownerSlugTaken } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";
import { slugify } from "@/lib/slug";

export async function getOrCreateOwnerAccount(email: string) {
  const normalized = email.trim().toLowerCase();
  const { auth, db } = initAdmin();
  let user = await auth.getUserByEmail(normalized).catch((error: { code?: string }) => {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  });
  if (!user) {
    user = await auth.createUser({
      email: normalized,
      emailVerified: false,
    });
  }
  const isAdmin = await accountIsAdmin(normalized);
  await auth.setCustomUserClaims(user.uid, { admin: isAdmin });

  const ownerRef = db.collection("owners").doc(user.uid);
  const ownerSnap = await ownerRef.get();
  if (!ownerSnap.exists) {
    const displayName = (normalized.split("@")[0] || "owner").trim();
    let slug = slugify(displayName) || `owner-${user.uid.slice(0, 6)}`;
    if (await ownerSlugTaken(slug)) slug = `${slug}-${user.uid.slice(0, 4)}`;
    const now = new Date().toISOString();
    const record = {
      displayName,
      slug,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: null,
      termsVersion: null,
    };
    await ownerRef.set(record);
    await writeHistory(
      "owners",
      user.uid,
      "create",
      record,
      historyActor({ uid: user.uid, email: normalized, name: displayName }, "owner", displayName),
    );
  }
  return { uid: user.uid, email: normalized, isAdmin };
}
