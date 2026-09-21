import { z } from "zod";
import { getOwner, slugTaken, toBusinessDoc, uenTaken } from "@/lib/data";
import { submittedPin } from "@/lib/geo";
import { HttpError } from "@/lib/http";
import { revalidatePublicListing } from "@/lib/cache";
import { listingColorsFromInput } from "@/lib/listing-colors";
import { DESCRIPTION_MAX, sanitizeMarkdown } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { assertBrandPrefixedSlug, brandSlugPrefix } from "@/lib/slug";
import { TERMS_CLAUSE_COUNT } from "@/lib/legal";
import { ownerIdentityLocked } from "@/lib/listing-review";
import { ADDRESS_MAX, parseAddress, type Business, type UrlPair, type VerificationType } from "@/lib/types";
import { parseWhatsappTemplate, submittedWhatsapp } from "@/lib/whatsapp";

export function listingWhatsapp(raw?: string | null) {
  try {
    return submittedWhatsapp(raw);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid WhatsApp number.");
  }
}

export const listingFieldsSchema = z.object({
  uen: z.string().min(8).max(20),
  registeredName: z.string().min(2).max(160),
  brandName: z.string().min(2).max(120),
  slug: z.string().optional(),
  contactEmail: z.string().email(),
  whatsapp: z.string().max(40).optional().nullable(),
  whatsappTemplate: z.string().max(500).optional().nullable(),
  summary: z.string().max(280).optional().default(""),
  description: z.string().max(DESCRIPTION_MAX).optional().default(""),
  urls: z
    .array(
      z.object({
        url: z.string().url(),
        label: z.string().min(1).max(40),
      }),
    )
    .max(8)
    .optional()
    .default([]),
  tagIds: z.array(z.string()).max(12).optional().default([]),
  photos: z.array(z.string()).max(5).optional().default([]),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  address: z.string().max(ADDRESS_MAX).optional().default(""),
  verificationType: z.enum(["uen_document", "linkedin"]),
  linkedinUrl: z.string().url().optional().nullable(),
  uenStoragePath: z.string().optional().nullable(),
  uenDownloadedAt: z.string().optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
});

export const listingCreateSchema = listingFieldsSchema.extend({
  acceptTerms: z.literal(true),
  acceptedClauseCount: z.literal(TERMS_CLAUSE_COUNT),
  termsCopy: z.string().max(8000).optional(),
  displayName: z.string().max(80).optional(),
});

export type ListingPatchInput = Partial<{
  uen: string;
  registeredName: string;
  brandName: string;
  slug: string;
  contactEmail: string;
  whatsapp: string | null;
  whatsappTemplate: string | null;
  summary: string;
  description: string;
  urls: UrlPair[];
  tagIds: string[];
  photos: string[];
  lat: number | null;
  lng: number | null;
  address: string;
  verificationType: VerificationType;
  linkedinUrl: string | null;
  uenStoragePath: string | null;
  uenDownloadedAt: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}>;

export async function refreshListing(
  business: { slug: string; ownerId: string },
  previousSlug?: string,
) {
  const owner = await getOwner(business.ownerId);
  revalidatePublicListing(business.slug, owner?.slug);
  if (previousSlug && previousSlug !== business.slug) {
    revalidatePublicListing(previousSlug, owner?.slug);
  }
}

export async function applyListingPatch(
  current: Business,
  data: ListingPatchInput,
  options: { allowIdentityChange: boolean; allowSlugChange?: boolean },
) {
  const mergedType = (data.verificationType || current.verificationType) as VerificationType;
  const changingEvidence =
    data.verificationType !== undefined ||
    data.uenStoragePath !== undefined ||
    data.uenDownloadedAt !== undefined ||
    (data.linkedinUrl !== undefined && mergedType === "linkedin");
  if (changingEvidence) {
    validateEvidence({
      verificationType: mergedType,
      linkedinUrl: data.linkedinUrl ?? current.linkedinUrl,
      uenStoragePath: data.uenStoragePath,
      uenDownloadedAt: data.uenDownloadedAt ?? current.uenDownloadedAt,
    });
  }

  const brandName = (data.brandName || current.brandName).trim();
  let slug = current.slug;
  try {
    if (options.allowSlugChange && data.slug) {
      slug = assertBrandPrefixedSlug(brandName, data.slug);
      if (await slugTaken(slug, current.id)) {
        throw new HttpError(409, `The slug “${slug}” is taken.`);
      }
    } else if (!ownerIdentityLocked(current.status)) {
      slug = brandSlugPrefix(brandName);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid page link.");
  }

  const nextUen = options.allowIdentityChange
    ? (data.uen || current.uen).trim().toUpperCase()
    : current.uen;
  const nextRegisteredName = options.allowIdentityChange
    ? (data.registeredName || current.registeredName).trim()
    : current.registeredName;
  if (await uenTaken(nextUen, current.id)) {
    throw new HttpError(409, "That UEN is already on the register.");
  }

  const now = new Date().toISOString();
  const next: Business = {
    ...current,
    uen: nextUen,
    registeredName: nextRegisteredName,
    brandName,
    slug,
    contactEmail: (data.contactEmail || current.contactEmail).trim().toLowerCase(),
    whatsapp: data.whatsapp !== undefined ? listingWhatsapp(data.whatsapp) : current.whatsapp,
    whatsappTemplate:
      data.whatsappTemplate !== undefined
        ? parseWhatsappTemplate(data.whatsappTemplate)
        : current.whatsappTemplate,
    summary: data.summary !== undefined ? data.summary.trim() : current.summary,
    description:
      data.description !== undefined
        ? sanitizeMarkdown(data.description)
        : current.description || "",
    urls: data.urls !== undefined ? data.urls : current.urls,
    tagIds: data.tagIds !== undefined ? data.tagIds : current.tagIds,
    photos: data.photos !== undefined ? parsePhotos(data.photos) : current.photos,
    ...pinFromPatch(data, current),
    address: data.address !== undefined ? parseAddress(data.address) : current.address,
    verificationType: mergedType,
    linkedinUrl: changingEvidence
      ? mergedType === "linkedin"
        ? data.linkedinUrl || current.linkedinUrl
        : null
      : current.linkedinUrl,
    uenDownloadedAt: changingEvidence
      ? mergedType === "uen_document"
        ? data.uenDownloadedAt || current.uenDownloadedAt
        : null
      : current.uenDownloadedAt,
    ...listingColorsFromInput(
      data.primaryColor !== undefined ? data.primaryColor : current.primaryColor,
      data.secondaryColor !== undefined ? data.secondaryColor : current.secondaryColor,
    ),
    updatedAt: now,
  };

  const stored: Record<string, unknown> = { ...toBusinessDoc(next) };
  if (changingEvidence) {
    stored.uenStoragePath =
      mergedType === "uen_document" ? data.uenStoragePath || null : null;
  }
  return { next, stored, changingEvidence };
}

export function pinFromBody(body: { lat?: number | null; lng?: number | null }) {
  try {
    const pin = submittedPin(body.lat, body.lng);
    return { lat: pin?.lat ?? null, lng: pin?.lng ?? null };
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid map pin.");
  }
}

function pinFromPatch(data: ListingPatchInput, current: Business) {
  if (data.lat === undefined && data.lng === undefined) {
    return { lat: current.lat ?? null, lng: current.lng ?? null };
  }
  return pinFromBody(data);
}

export function validateEvidence(body: {
  verificationType: VerificationType;
  linkedinUrl?: string | null;
  uenStoragePath?: string | null;
  uenDownloadedAt?: string | null;
}) {
  if (body.verificationType === "linkedin") {
    if (!body.linkedinUrl || !/linkedin\.com\//i.test(body.linkedinUrl)) {
      throw new HttpError(400, "Paste a public LinkedIn profile URL.");
    }
  }
  if (body.verificationType === "uen_document") {
    if (!body.uenStoragePath) {
      throw new HttpError(400, "Upload a UEN document.");
    }
  }
}
