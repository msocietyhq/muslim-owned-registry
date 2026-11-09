import type { Business, Owner } from "@/lib/types";
import { whatsappHref } from "@/lib/whatsapp";

function absoluteUrl(origin: string, value: string) {
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  if (value.startsWith("/")) return `${origin}${value}`;
  return `${origin}/api/files/${encodeURIComponent(value)}`;
}

export function toPublicListing(
  business: Business,
  tagNames: Map<string, string>,
  origin: string,
  owner: Pick<Owner, "displayName" | "slug"> | null,
) {
  return {
    id: business.id,
    slug: business.slug,
    url: `${origin}/biz/${business.slug}`,
    brandName: business.brandName,
    registeredName: business.registeredName,
    uen: business.uen,
    summary: business.summary,
    description: business.description,
    photos: business.photos.map((photo) => absoluteUrl(origin, photo)),
    contactEmail: business.contactEmail,
    whatsapp: business.whatsapp,
    whatsappUrl: business.whatsapp
      ? whatsappHref(business.whatsapp, business.whatsappTemplate)
      : null,
    urls: business.urls,
    linkedinUrl: business.linkedinUrl,
    address: business.address,
    lat: business.lat,
    lng: business.lng,
    tags: business.tagIds.map((id) => tagNames.get(id) || id),
    unclaimed: Boolean(business.unclaimed),
    primaryColor: business.primaryColor,
    secondaryColor: business.secondaryColor,
    owner: owner
      ? { name: owner.displayName, url: `${origin}/owner/${owner.slug}` }
      : null,
  };
}

export async function ownersById(ids: string[]) {
  const { getOwner } = await import("@/lib/data");
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const pairs = await Promise.all(unique.map(async (id) => [id, await getOwner(id)] as const));
  return new Map(pairs.filter((pair): pair is [string, NonNullable<typeof pair[1]>] => Boolean(pair[1])));
}
