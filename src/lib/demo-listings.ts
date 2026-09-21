import { addMonths } from "@/lib/crypto";
import { DEMO_BUSINESSES, DEMO_OWNERS, EXTRA_TAGS } from "@/lib/demo-catalog";
import { SG_PLACES } from "@/lib/geo";
import { slugify } from "@/lib/slug";
import { CONFIRMATION_MONTHS, type Business, type Owner, type Tag } from "@/lib/types";

const BASE_TAGS: { name: string; children?: string[] }[] = [
  { name: "Food", children: ["Catering", "Bakery", "Restaurant", "Hawker"] },
  { name: "Venue", children: ["Hall", "Studio"] },
  { name: "Party logistics", children: ["Décor", "Rental", "Photography"] },
  { name: "Services" },
  { name: "Retail" },
  { name: "Education" },
  { name: "Health" },
  { name: "Professional" },
];

const nowIso = "2026-09-17T04:00:00.000Z";

function titlePlace(place: string) {
  return place
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function demoTags(): Tag[] {
  const tags: Tag[] = [];
  for (const parent of BASE_TAGS) {
    const parentId = slugify(parent.name);
    tags.push({ id: parentId, name: parent.name, slug: parentId, parentId: null });
    for (const child of parent.children || []) {
      const childId = slugify(child);
      tags.push({ id: childId, name: child, slug: childId, parentId });
    }
  }
  for (const tag of EXTRA_TAGS) {
    const id = slugify(tag.name);
    tags.push({ id, name: tag.name, slug: id, parentId: tag.parent });
  }
  return tags.sort((a, b) => a.name.localeCompare(b.name));
}

export function demoOwners(): Owner[] {
  return DEMO_OWNERS.map((owner) => ({
    id: owner.id,
    displayName: owner.displayName,
    slug: owner.slug,
    createdAt: nowIso,
    updatedAt: nowIso,
    termsAcceptedAt: nowIso,
    termsVersion: "2026-09-17",
  }));
}

function demoConfirmedAt(index: number) {
  const confirmed = new Date(nowIso);
  if (index % 9 === 0) {
    confirmed.setUTCMonth(confirmed.getUTCMonth() - 5);
    confirmed.setUTCDate(confirmed.getUTCDate() - 4);
  } else if (index % 9 === 1) {
    confirmed.setUTCMonth(confirmed.getUTCMonth() - 4);
    confirmed.setUTCDate(confirmed.getUTCDate() - 12);
  } else {
    confirmed.setUTCDate(confirmed.getUTCDate() - (index % 40));
  }
  return confirmed.toISOString();
}

function demoPhotos(index: number) {
  const count = (index % 5) + 1;
  return Array.from({ length: count }, (_, offset) => `/demo-photos/${((index + offset) % 5) + 1}.svg`);
}

/** Even indexes among the 50 sample rows: 25 listings. */
export function demoWhatsapp(index: number, brand: string) {
  if (index % 2 !== 0) return { whatsapp: null, whatsappTemplate: null };
  const local = `8${String(2000000 + index * 137).slice(-7)}`;
  return {
    whatsapp: `65${local}`,
    whatsappTemplate:
      index % 4 === 0 ? `Hi, I found ${brand} on muslimowned.sg.` : null,
  };
}

export function demoBusinesses(): Business[] {
  return DEMO_BUSINESSES.map((row, index) => {
    const n = index + 1;
    const owner = DEMO_OWNERS[index % DEMO_OWNERS.length]!;
    const confirmedIso = demoConfirmedAt(index);
    const pin =
      row.place === "online" ? { lat: null, lng: null } : SG_PLACES[row.place] || { lat: null, lng: null };
    const slug = slugify(row.brand);
    return {
      id: `demo-biz-${String(n).padStart(2, "0")}`,
      ownerId: owner.id,
      uen: `T99DM${String(n).padStart(4, "0")}A`,
      registeredName: row.registered,
      brandName: row.brand,
      slug,
      contactEmail: `demo.${slug.replace(/-/g, ".")}@example.com`,
      ...demoWhatsapp(index, row.brand),
      summary: row.summary,
      description: row.description,
      urls: row.urls,
      tagIds: row.tags,
      photos: demoPhotos(index),
      lat: pin.lat,
      lng: pin.lng,
      address: row.place === "online" ? "" : `${titlePlace(row.place)}, Singapore`,
      status: "live" as const,
      verificationType: row.verification,
      linkedinUrl:
        row.verification === "linkedin" ? `https://www.linkedin.com/in/${owner.slug}` : null,
      uenDownloadedAt: row.verification === "uen_document" ? "2026-01-15" : null,
      lastConfirmedAt: confirmedIso,
      confirmationDueAt: addMonths(confirmedIso, CONFIRMATION_MONTHS),
      lastReminderAt: null,
      lastAdminNote: null,
      termsAcceptedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      isDemo: true,
      foundingSlot: null,
      featuredUntil: null,
      primaryColor: null,
      secondaryColor: null,
    };
  }).sort((a, b) => a.brandName.localeCompare(b.brandName));
}
