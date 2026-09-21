import { addDays, randomToken, sha256 } from "@/lib/crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { siteUrl } from "@/lib/http";

const COLLECTION = "listingLinks";
const TTL_DAYS = 45;

export function listingLinkId(token: string) {
  return sha256(token);
}

export async function createManageLink(businessId: string) {
  const token = randomToken(32);
  const { db } = initAdmin();
  const now = new Date().toISOString();
  await db.collection(COLLECTION).doc(listingLinkId(token)).set({
    businessId,
    createdAt: now,
    expiresAt: addDays(now, TTL_DAYS),
  });
  return {
    token,
    url: `${siteUrl()}/m/${token}`,
  };
}

export async function readManageLink(token: string) {
  if (!token || token.length < 32) return null;
  const { db } = initAdmin();
  const snap = await db.collection(COLLECTION).doc(listingLinkId(token)).get();
  if (!snap.exists) return null;
  const data = snap.data() as { businessId?: string; expiresAt?: string };
  if (!data.businessId || !data.expiresAt) return null;
  if (new Date(data.expiresAt).getTime() < Date.now()) return null;
  return { businessId: data.businessId, expiresAt: data.expiresAt };
}
