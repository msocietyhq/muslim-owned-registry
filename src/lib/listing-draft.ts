import { z } from "zod";
import { emptyListingLinks, type ListingLinkValues } from "@/lib/listing-urls";
import { DESCRIPTION_MAX } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { ADDRESS_MAX } from "@/lib/types";

const linksSchema = z.object({
  website: z.string().max(300).optional().default(""),
  instagram: z.string().max(300).optional().default(""),
  facebook: z.string().max(300).optional().default(""),
  tiktok: z.string().max(300).optional().default(""),
});

export const listingDraftFieldsSchema = z.object({
  displayName: z.string().max(80).optional().default(""),
  uen: z.string().max(20).optional().default(""),
  registeredName: z.string().max(160).optional().default(""),
  brandName: z.string().max(120).optional().default(""),
  slug: z.string().max(80).optional().default(""),
  contactEmail: z.string().max(120).optional().default(""),
  whatsapp: z.string().max(40).optional().default(""),
  whatsappTemplate: z.string().max(500).optional().default(""),
  summary: z.string().max(280).optional().default(""),
  description: z.string().max(DESCRIPTION_MAX).optional().default(""),
  photos: z.array(z.string()).max(5).optional().default([]),
  links: linksSchema.optional().default({ website: "", instagram: "", facebook: "", tiktok: "" }),
  tagIds: z.array(z.string().max(80)).max(12).optional().default([]),
  tagsTouched: z.boolean().optional().default(false),
  lat: z.number().nullable().optional().default(null),
  lng: z.number().nullable().optional().default(null),
  address: z.string().max(ADDRESS_MAX).optional().default(""),
  locationMode: z.enum(["online", "pin"]).optional().default("online"),
  verificationType: z.enum(["uen_document", "linkedin"]).optional().default("uen_document"),
  linkedinUrl: z.string().max(300).optional().default(""),
  primaryColor: z.string().max(20).optional().default(""),
  secondaryColor: z.string().max(20).optional().default(""),
});

export type ListingDraftFields = z.infer<typeof listingDraftFieldsSchema>;

export type ListingDraft = ListingDraftFields & { updatedAt: string };

export function emptyListingDraft(): ListingDraftFields {
  return listingDraftFieldsSchema.parse({});
}

export function parseListingDraft(raw: unknown): ListingDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = listingDraftFieldsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const fields = parsed.data;
  const updatedAt =
    typeof (raw as { updatedAt?: unknown }).updatedAt === "string"
      ? (raw as { updatedAt: string }).updatedAt
      : "";
  return {
    ...fields,
    photos: parsePhotos(fields.photos),
    links: {
      website: fields.links.website.trim(),
      instagram: fields.links.instagram.trim(),
      facebook: fields.links.facebook.trim(),
      tiktok: fields.links.tiktok.trim(),
    } satisfies ListingLinkValues,
    updatedAt,
  };
}

export function isListingDraftEmpty(draft: ListingDraftFields) {
  const links = draft.links || emptyListingLinks();
  return (
    !draft.displayName.trim() &&
    !draft.uen.trim() &&
    !draft.registeredName.trim() &&
    !draft.brandName.trim() &&
    !draft.slug.trim() &&
    !draft.contactEmail.trim() &&
    !draft.whatsapp.trim() &&
    !draft.whatsappTemplate.trim() &&
    !draft.summary.trim() &&
    !draft.description.trim() &&
    draft.photos.length === 0 &&
    !links.website.trim() &&
    !links.instagram.trim() &&
    !links.facebook.trim() &&
    !links.tiktok.trim() &&
    draft.tagIds.length === 0 &&
    draft.lat == null &&
    draft.lng == null &&
    !draft.address.trim() &&
    !draft.linkedinUrl.trim() &&
    !draft.primaryColor.trim() &&
    !draft.secondaryColor.trim()
  );
}

export function listingDraftDocId(ownerId: string) {
  return ownerId;
}
