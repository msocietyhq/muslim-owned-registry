import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { revalidatePublicListing } from "@/lib/cache";
import { allocatePublishedSlug, toBusinessDoc, uenTaken } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistory } from "@/lib/history";
import { HttpError } from "@/lib/http";
import { listingColorsFromInput } from "@/lib/listing-colors";
import { listingWhatsapp, pinFromBody } from "@/lib/listing-update";
import { sanitizeMarkdown } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { publicSnapshot } from "@/lib/public-fields";
import { brandSlugPrefix } from "@/lib/slug";
import { parseAddress, type Business, type UrlPair } from "@/lib/types";
import { parseWhatsappTemplate } from "@/lib/whatsapp";

export type UnclaimedListingInput = {
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
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export async function createUnclaimedListing(
  admin: { uid: string; email?: string | null; name?: string | null },
  input: UnclaimedListingInput,
) {
  const brandName = input.brandName.trim();
  if (brandName.length < 2) {
    throw new HttpError(400, "Add a brand name.");
  }
  const uen = (input.uen || "").trim().toUpperCase();
  if (await uenTaken(uen)) {
    throw new HttpError(409, "That UEN is already on the register.");
  }

  let base: string;
  try {
    base = brandSlugPrefix(brandName);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid brand name.");
  }

  const pin = pinFromBody(input);
  const now = new Date().toISOString();
  const id = randomUUID();
  const slug = await allocatePublishedSlug(base, id);
  const contactEmail = (input.contactEmail || "").trim().toLowerCase();
  const business: Business = {
    id,
    ownerId: "",
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
    status: "live",
    verificationType: "uen_document",
    linkedinUrl: null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    lastAdminNote: null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
    isDemo: false,
    foundingSlot: null,
    featuredUntil: null,
    supersedesBusinessId: null,
    unclaimed: false,
    ...listingColorsFromInput(input.primaryColor, input.secondaryColor),
  };

  const { db } = initAdmin();
  const stored = {
    ...toBusinessDoc(business),
    addedByAdminId: admin.uid,
  };
  const actor = historyActor(admin, "admin");
  await db.collection("businesses").doc(id).set(stored);
  await writeHistory("businesses", id, "create", publicSnapshot(stored), actor);
  revalidatePublicListing(slug);
  revalidatePath("/browse");
  return { business };
}
