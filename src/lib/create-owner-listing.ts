import { randomUUID } from "crypto";
import { getBusinessesByOwner, getOwner, getTagMap, toBusinessDoc, uenTaken } from "@/lib/data";
import { listingColorsFromInput } from "@/lib/listing-colors";
import { applyOwnerPublicName, needsOwnerPublicName } from "@/lib/owner-name";
import {
  listingCreateSchema,
  listingWhatsapp,
  pinFromBody,
  validateEvidence,
} from "@/lib/listing-update";
import { initAdmin } from "@/lib/firebase/admin";
import { FOUNDING_STATS_DOC, nextFoundingSlot } from "@/lib/founding";
import { historyActor, writeHistory } from "@/lib/history";
import { HttpError } from "@/lib/http";
import { acceptedTermsCopy } from "@/lib/legal";
import { publicSnapshot } from "@/lib/public-fields";
import { sanitizeMarkdown } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { brandSlugPrefix } from "@/lib/slug";
import { parseAddress, TERMS_VERSION, type Business } from "@/lib/types";
import { parseWhatsappTemplate } from "@/lib/whatsapp";
import type { z } from "zod";

export type OwnerListingCreateBody = z.infer<typeof listingCreateSchema>;

export type OwnerListingReceipt = {
  to: string;
  brandName: string;
  registeredName: string;
  uen: string;
  slug: string;
  contactEmail: string;
  whatsapp: string | null;
  whatsappTemplate: string | null;
  summary: string;
  description: string;
  urls: Business["urls"];
  tagNames: string[];
  location: string;
  verificationPath: string;
  verificationDetail: string;
  photoCount: number;
  submittedAt: string;
  termsVersion: string;
  termsCopy: string;
};

async function ownerActor(user: { uid: string; email?: string | null; name?: string | null }) {
  const owner = await getOwner(user.uid);
  return historyActor(user, "owner", owner?.displayName);
}

export async function createOwnerListing(params: {
  user: { uid: string; email?: string | null; name?: string | null };
  body: OwnerListingCreateBody;
}) {
  const { user, body } = params;
  const existingListings = await getBusinessesByOwner(user.uid);
  validateEvidence(body);
  const pin = pinFromBody(body);

  if (needsOwnerPublicName(existingListings.length)) {
    await applyOwnerPublicName(user, body.displayName || "");
  }

  let slug: string;
  try {
    slug = brandSlugPrefix(body.brandName);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid page link.");
  }
  if (await uenTaken(body.uen.trim().toUpperCase())) {
    throw new HttpError(409, "That UEN is already on the register.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const business: Business = {
    id,
    ownerId: user.uid,
    uen: body.uen.trim().toUpperCase(),
    registeredName: body.registeredName.trim(),
    brandName: body.brandName.trim(),
    slug,
    contactEmail: body.contactEmail.trim().toLowerCase(),
    whatsapp: listingWhatsapp(body.whatsapp),
    whatsappTemplate: parseWhatsappTemplate(body.whatsappTemplate),
    summary: body.summary.trim(),
    description: sanitizeMarkdown(body.description),
    urls: body.urls,
    tagIds: body.tagIds,
    photos: parsePhotos(body.photos),
    lat: pin.lat,
    lng: pin.lng,
    address: parseAddress(body.address),
    status: "pending_review",
    verificationType: body.verificationType,
    linkedinUrl: body.verificationType === "linkedin" ? body.linkedinUrl || null : null,
    uenDownloadedAt:
      body.verificationType === "uen_document" ? body.uenDownloadedAt || null : null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    lastAdminNote: null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
    isDemo: null,
    foundingSlot: null,
    featuredUntil: null,
    ...listingColorsFromInput(body.primaryColor, body.secondaryColor),
  };

  const stored: Record<string, unknown> = {
    ...toBusinessDoc(business),
    uenStoragePath:
      body.verificationType === "uen_document" ? body.uenStoragePath || null : null,
  };

  const { db } = initAdmin();
  const actor = await ownerActor(user);
  await db.runTransaction(async (tx) => {
    const counterRef = db.doc(FOUNDING_STATS_DOC);
    const counterSnap = await tx.get(counterRef);
    const claimedRaw = counterSnap.data()?.claimed;
    const claimed = typeof claimedRaw === "number" ? claimedRaw : 0;
    const foundingSlot = nextFoundingSlot(claimed, business.isDemo);
    business.foundingSlot = foundingSlot;
    stored.foundingSlot = foundingSlot;
    stored.featuredUntil = null;
    if (foundingSlot != null) {
      tx.set(
        counterRef,
        { claimed: foundingSlot, updatedAt: now },
        { merge: true },
      );
    }
    tx.set(db.collection("businesses").doc(id), stored);
  });
  await writeHistory("businesses", id, "create", publicSnapshot(stored), actor);
  await db.collection("owners").doc(user.uid).set(
    {
      termsAcceptedAt: now,
      termsVersion: TERMS_VERSION,
      updatedAt: now,
    },
    { merge: true },
  );

  const verificationId = randomUUID();
  const verification = {
    id: verificationId,
    businessId: id,
    type: body.verificationType,
    email: business.contactEmail,
    verificationUrl: business.linkedinUrl,
    verifiedAt: null,
    createdAt: now,
  };
  await db.collection("verifications").doc(verificationId).set(verification);
  await writeHistory("verifications", verificationId, "create", verification, actor);

  const termsText = acceptedTermsCopy(body.termsCopy);
  const tags = await getTagMap();
  const tagNames = business.tagIds
    .map((tagId) => tags.get(tagId)?.name || "")
    .filter(Boolean);

  const taskId = randomUUID();
  await db.collection("adminTasks").doc(taskId).set({
    id: taskId,
    type: "listing_verification",
    status: "open",
    businessId: id,
    ownerId: user.uid,
    payload: {
      ...publicSnapshot(stored),
      termsCopyVersion: TERMS_VERSION,
      termsCopy: termsText,
    },
    uenStoragePath: stored.uenStoragePath,
    createdAt: now,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
  });

  return {
    stored,
    taskId,
    receipt: {
      to: business.contactEmail,
      brandName: business.brandName,
      registeredName: business.registeredName,
      uen: business.uen,
      slug: business.slug,
      contactEmail: business.contactEmail,
      whatsapp: business.whatsapp,
      whatsappTemplate: business.whatsappTemplate,
      summary: business.summary,
      description: business.description,
      urls: business.urls,
      tagNames,
      location: [
        business.address || "",
        business.lat == null || business.lng == null
          ? "Online, no map pin"
          : `Pinned on OpenStreetMap (${business.lat}, ${business.lng})`,
      ]
        .filter(Boolean)
        .join(" · "),
      verificationPath:
        business.verificationType === "linkedin"
          ? "Public LinkedIn profile"
          : "UEN document",
      verificationDetail:
        business.verificationType === "linkedin"
          ? business.linkedinUrl || "None"
          : "UEN document uploaded. An admin will check the date on the file.",
      photoCount: business.photos.length,
      submittedAt: now,
      termsVersion: TERMS_VERSION,
      termsCopy: termsText,
    } satisfies OwnerListingReceipt,
  };
}
