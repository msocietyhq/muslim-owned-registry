import { randomUUID } from "crypto";
import { listingOwnerChallengeExpiresAt, randomToken, sha256, sixDigitCode } from "@/lib/crypto";
import { listingOwnerAppPath } from "@/lib/app-path";
import { getOrCreateOwnerAccount } from "@/lib/ensure-owner";
import { sendListingInviteMail } from "@/lib/email";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";
import { HttpError, siteUrl } from "@/lib/http";
import { listingColorsFromInput } from "@/lib/listing-colors";
import { listingWhatsapp, pinFromBody } from "@/lib/listing-update";
import { sanitizeMarkdown } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { publicSnapshot } from "@/lib/public-fields";
import { brandSlugPrefix } from "@/lib/slug";
import { parseAddress, type Business, type UrlPair, type VerificationType } from "@/lib/types";
import { toBusinessDoc, uenTaken } from "@/lib/data";
import { parseWhatsappTemplate } from "@/lib/whatsapp";

export type AdminForOthersInput = {
  ownerEmail: string;
  displayName?: string;
  uen?: string;
  registeredName?: string;
  brandName: string;
  contactEmail?: string;
  whatsapp?: string | null;
  whatsappTemplate?: string | null;
  summary?: string;
  description?: string;
  urls?: UrlPair[];
  tagIds?: string[];
  photos?: string[];
  lat?: number | null;
  lng?: number | null;
  address?: string;
  verificationType?: VerificationType;
  linkedinUrl?: string | null;
  uenStoragePath?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export async function createListingForOtherOwner(
  admin: { uid: string; email?: string | null; name?: string | null },
  input: AdminForOthersInput,
) {
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const brandName = input.brandName.trim();
  if (brandName.length < 2) {
    throw new HttpError(400, "Add a brand name so the owner can recognise the listing.");
  }
  const uen = (input.uen || "").trim().toUpperCase();
  if (await uenTaken(uen)) {
    throw new HttpError(409, "That UEN is already on the register.");
  }
  const owner = await getOrCreateOwnerAccount(ownerEmail);
  if (input.displayName?.trim()) {
    const { applyOwnerPublicName } = await import("@/lib/owner-name");
    await applyOwnerPublicName({ uid: owner.uid, email: owner.email }, input.displayName);
  }

  let slug: string;
  try {
    slug = brandSlugPrefix(brandName);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid brand name.");
  }

  const pin = pinFromBody(input);
  const now = new Date().toISOString();
  const id = randomUUID();
  const contactEmail = (input.contactEmail || ownerEmail).trim().toLowerCase();
  const verificationType: VerificationType = input.verificationType || "uen_document";
  const business: Business = {
    id,
    ownerId: owner.uid,
    uen,
    registeredName: (input.registeredName || "").trim(),
    brandName,
    slug,
    contactEmail,
    whatsapp: listingWhatsapp(input.whatsapp),
    whatsappTemplate: parseWhatsappTemplate(input.whatsappTemplate),
    summary: (input.summary || "").trim(),
    description: sanitizeMarkdown(input.description || ""),
    urls: input.urls || [],
    tagIds: input.tagIds || [],
    photos: parsePhotos(input.photos),
    lat: pin.lat,
    lng: pin.lng,
    address: parseAddress(input.address),
    status: "draft",
    verificationType,
    linkedinUrl: verificationType === "linkedin" ? input.linkedinUrl || null : null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    lastAdminNote: null,
    termsAcceptedAt: "",
    createdAt: now,
    updatedAt: now,
    isDemo: null,
    foundingSlot: null,
    featuredUntil: null,
    ...listingColorsFromInput(input.primaryColor, input.secondaryColor),
  };

  const { db } = initAdmin();
  const stored: Record<string, unknown> = {
    ...toBusinessDoc(business),
    uenStoragePath: verificationType === "uen_document" ? input.uenStoragePath || null : null,
    startedByAdminId: admin.uid,
  };
  const actor = historyActor(admin, "admin");
  await db.collection("businesses").doc(id).set(stored);
  await writeHistory("businesses", id, "create", publicSnapshot(stored), actor);

  const nextPath = listingOwnerAppPath(id);
  const loginToken = randomToken();
  const code = sixDigitCode();
  await db.collection("loginChallenges").doc(ownerEmail).set({
    email: ownerEmail,
    codeHash: sha256(code),
    tokenHash: sha256(loginToken),
    nextPath,
    kind: "listing-invite",
    expiresAt: listingOwnerChallengeExpiresAt(now),
    createdAt: now,
  });
  const openUrl = `${siteUrl()}/login/verify?email=${encodeURIComponent(ownerEmail)}&token=${loginToken}&next=${encodeURIComponent(nextPath)}`;
  await sendListingInviteMail({
    to: ownerEmail,
    brandName,
    openUrl,
  });

  return { business, openUrl, ownerEmail };
}
