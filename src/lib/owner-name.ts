import { getOwner, ownerSlugTaken } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";
import { HttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";

export function needsOwnerPublicName(listingCount: number) {
  return listingCount === 0;
}

export async function applyOwnerPublicName(
  user: { uid: string; email?: string | null },
  rawName: string,
) {
  const displayName = rawName.trim();
  if (displayName.length < 2 || displayName.length > 80) {
    throw new HttpError(400, "Enter a public name of 2 to 80 characters.");
  }
  const { db } = initAdmin();
  const ownerRef = db.collection("owners").doc(user.uid);
  const snap = await ownerRef.get();
  let slug = slugify(displayName) || `owner-${user.uid.slice(0, 6)}`;
  if (await ownerSlugTaken(slug, user.uid)) slug = `${slug}-${user.uid.slice(0, 4)}`;
  const now = new Date().toISOString();
  const current = snap.data() || {};
  const next = {
    ...current,
    displayName,
    slug,
    updatedAt: now,
    ...(snap.exists
      ? {}
      : { createdAt: now, termsAcceptedAt: null, termsVersion: null }),
  };
  await ownerRef.set(next, { merge: true });
  const actor = historyActor(user, "owner", displayName);
  await writeHistory("owners", user.uid, snap.exists ? "update" : "create", next, actor);
  const owner = await getOwner(user.uid);
  return owner;
}
