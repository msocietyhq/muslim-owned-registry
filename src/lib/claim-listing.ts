import { randomUUID } from "crypto";
import { notifyAdminsOfOpenTask } from "@/lib/admin-notify";
import {
  getBusiness,
  getBusinessBySlug,
  getBusinessesByOwner,
  getOwner,
  slugTaken,
  toBusinessDoc,
  uenTaken,
} from "@/lib/data";
import { getOrCreateOwnerAccount } from "@/lib/ensure-owner";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";
import { HttpError } from "@/lib/http";
import { acceptedTermsCopy } from "@/lib/legal";
import { revalidatePath } from "next/cache";
import { revalidatePublicListing } from "@/lib/cache";
import { publicSnapshot } from "@/lib/public-fields";
import { TERMS_VERSION, type Business, type HistoryActor } from "@/lib/types";
import { accountOwnerIds, canRemoveUnclaimedListing, listingIsUnclaimed } from "@/lib/unclaimed";

function claimSlugFor(sourceSlug: string, id: string) {
  const base = `${sourceSlug}-claim`.replace(/[^a-z0-9-]/gi, "").slice(0, 72);
  return base || `claim-${id.slice(0, 8)}`;
}

export async function claimUnclaimedListing(input: {
  user: { uid: string; email: string; name?: string | null };
  slug: string;
  acceptTerms?: boolean;
  termsCopy?: string;
}) {
  const source = await getBusinessBySlug(input.slug);
  if (!source || source.status !== "live") {
    throw new HttpError(404, "Listing not found.");
  }
  const accountIds = await accountOwnerIds();
  if (!listingIsUnclaimed(source, accountIds)) {
    throw new HttpError(400, "This listing already has an account.");
  }

  await getOrCreateOwnerAccount(input.user.email);
  const owner = await getOwner(input.user.uid);
  const needsTerms = owner?.termsVersion !== TERMS_VERSION;
  if (needsTerms && !input.acceptTerms) {
    throw new HttpError(400, "Accept the terms to claim this listing.");
  }

  const mine = await getBusinessesByOwner(input.user.uid);
  const existing = mine.find(
    (row) => row.supersedesBusinessId === source.id && row.status !== "removed",
  );
  if (existing) return { businessId: existing.id, already: true };

  if (source.uen && (await uenTaken(source.uen, source.id))) {
    throw new HttpError(409, "That UEN is already on another listing.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  let slug = claimSlugFor(source.slug, id);
  if (await slugTaken(slug)) slug = `${slug}-${id.slice(0, 4)}`;

  const business: Business = {
    ...source,
    id,
    ownerId: input.user.uid,
    slug,
    status: "pending_review",
    supersedesBusinessId: source.id,
    unclaimed: false,
    isDemo: false,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    lastAdminNote: null,
    foundingSlot: null,
    featuredUntil: null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const stored = toBusinessDoc(business);
  const { db } = initAdmin();
  const actor = historyActor(input.user, "owner", owner?.displayName);
  await db.collection("businesses").doc(id).set(stored);
  await writeHistory("businesses", id, "create", publicSnapshot(stored), actor);

  if (needsTerms) {
    await db.collection("owners").doc(input.user.uid).set(
      {
        termsAcceptedAt: now,
        termsVersion: TERMS_VERSION,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  const verificationId = randomUUID();
  const verification = {
    id: verificationId,
    businessId: id,
    type: business.verificationType,
    email: business.contactEmail,
    verificationUrl: business.linkedinUrl,
    verifiedAt: null,
    createdAt: now,
  };
  await db.collection("verifications").doc(verificationId).set(verification);
  await writeHistory("verifications", verificationId, "create", verification, actor);

  const taskId = randomUUID();
  await db.collection("adminTasks").doc(taskId).set({
    id: taskId,
    type: "listing_verification",
    status: "open",
    businessId: id,
    ownerId: input.user.uid,
    payload: {
      ...publicSnapshot(stored),
      supersedesBusinessId: source.id,
      termsCopyVersion: TERMS_VERSION,
      termsCopy: acceptedTermsCopy(input.termsCopy),
      claimNote: "Copied from an unclaimed listing. Approving this copy removes the unclaimed page.",
    },
    uenStoragePath: null,
    createdAt: now,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
  });

  void notifyAdminsOfOpenTask({
    type: "listing_verification",
    heading: `${business.brandName} is waiting for review`,
    detail: `${business.brandName} was claimed from an unclaimed page. Open the admin page to accept or reject the copy. Approving it removes the unclaimed listing.`,
  }).catch((error) => console.error("admin task mail", error));

  return { businessId: id, already: false, taskId };
}

export async function removeUnclaimedByActor(input: {
  id: string;
  actor: HistoryActor;
  isAdmin: boolean;
}) {
  const source = await getBusiness(input.id);
  if (!source || source.status === "removed") throw new HttpError(404, "Listing not found.");
  const accountIds = await accountOwnerIds();
  if (
    !canRemoveUnclaimedListing(source, accountIds, {
      uid: input.actor.id,
      isAdmin: input.isAdmin,
    })
  ) {
    throw new HttpError(403, "Only an admin can remove an unclaimed listing.");
  }
  const now = new Date().toISOString();
  const next: Business = { ...source, status: "removed", updatedAt: now, unclaimed: false };
  const { db } = initAdmin();
  await db.collection("businesses").doc(source.id).set(toBusinessDoc(next), { merge: true });
  await writeHistory("businesses", source.id, "delete", publicSnapshot(toBusinessDoc(next)), input.actor);
  revalidatePublicListing(source.slug);
  revalidatePath("/browse");
  return next;
}

export async function retireSupersededUnclaimed(sourceId: string, actor: HistoryActor) {
  const source = await getBusiness(sourceId);
  if (!source || source.status === "removed") return null;
  const accountIds = await accountOwnerIds();
  if (!listingIsUnclaimed(source, accountIds)) return null;
  const now = new Date().toISOString();
  const next: Business = { ...source, status: "removed", updatedAt: now, unclaimed: false };
  const { db } = initAdmin();
  await db.collection("businesses").doc(source.id).set(toBusinessDoc(next), { merge: true });
  await writeHistory("businesses", source.id, "delete", publicSnapshot(toBusinessDoc(next)), actor);
  revalidatePublicListing(source.slug);
  return source;
}
