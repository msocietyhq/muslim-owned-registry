import { hasDatabase } from "@/lib/db/client";
import { initAdmin } from "@/lib/firebase/admin";
import { parseLatLng } from "@/lib/geo";
import { demoBusinesses, demoOwners, demoTags } from "@/lib/demo-listings";
import { listingColorsFromInput } from "@/lib/listing-colors";
import { parsePhotos } from "@/lib/photos";
import { parseFeaturedUntil, parseFoundingSlot } from "@/lib/founding";
import { listingSlugReserved } from "@/lib/listing-review";
import {
  excludeDemoListings,
  isDemoListing,
  parseAddress,
  parseDemoFlag,
  type Business,
  type Owner,
  type Tag,
  type Verification,
} from "@/lib/types";
import { nextAvailableSlug } from "@/lib/slug";
import { parseWhatsappNumber, parseWhatsappTemplate } from "@/lib/whatsapp";

export function asBusiness(id: string, data: Record<string, unknown>): Business {
  const pin = parseLatLng(data.lat, data.lng);
  const {
    is_demo,
    isDemo,
    description,
    lat,
    lng,
    photos,
    lastReminderAt,
    foundingSlot,
    featuredUntil,
    address,
    lastAdminNote,
    whatsapp,
    whatsappTemplate,
    primaryColor,
    secondaryColor,
    ...rest
  } = data;
  return {
    ...(rest as Omit<
      Business,
      | "id"
      | "description"
      | "lat"
      | "lng"
      | "isDemo"
      | "photos"
      | "lastReminderAt"
      | "foundingSlot"
      | "featuredUntil"
      | "address"
      | "lastAdminNote"
      | "whatsapp"
      | "whatsappTemplate"
      | "primaryColor"
      | "secondaryColor"
    >),
    id,
    description: typeof description === "string" ? description : "",
    lat: pin?.lat ?? null,
    lng: pin?.lng ?? null,
    isDemo: parseDemoFlag(is_demo ?? isDemo),
    photos: parsePhotos(photos),
    lastReminderAt: typeof lastReminderAt === "string" ? lastReminderAt : null,
    foundingSlot: parseFoundingSlot(foundingSlot),
    featuredUntil: parseFeaturedUntil(featuredUntil),
    address: parseAddress(address),
    lastAdminNote: typeof lastAdminNote === "string" && lastAdminNote.trim() ? lastAdminNote : null,
    whatsapp: parseWhatsappNumber(typeof whatsapp === "string" ? (whatsapp as string) : null),
    whatsappTemplate: parseWhatsappTemplate(typeof whatsappTemplate === "string" ? (whatsappTemplate as string) : null),
    ...listingColorsFromInput(
      typeof primaryColor === "string" ? primaryColor : null,
      typeof secondaryColor === "string" ? secondaryColor : null,
    ),
  };
}

export function toBusinessDoc(business: Business): Record<string, unknown> {
  const { isDemo, ...rest } = business;
  return { ...rest, is_demo: isDemo };
}

export async function canReadFirestore() {
  return hasDatabase();
}

export async function getTags(): Promise<Tag[]> {
  try {
    if (!(await hasDatabase())) return demoTags();
    const { db } = initAdmin();
    const snap = await db.collection("tags").orderBy("name").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Tag, "id">) }));
  } catch (error) {
    console.error("getTags", error);
    return [];
  }
}

export async function getTagMap() {
  const tags = await getTags();
  return new Map(tags.map((tag) => [tag.id, tag]));
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const tags = await getTags();
  return tags.find((tag) => tag.slug === slug) || null;
}

export async function getLiveBusinesses(): Promise<Business[]> {
  try {
    if (!(await hasDatabase())) return [];
    const { db } = initAdmin();
    const snap = await db
      .collection("businesses")
      .where("status", "==", "live")
      .get();
    return excludeDemoListings(
      snap.docs
        .map((doc) => asBusiness(doc.id, doc.data() || {}))
        .sort((a, b) => a.brandName.localeCompare(b.brandName)),
    );
  } catch (error) {
    console.error("getLiveBusinesses", error);
    return [];
  }
}

export async function getAllBusinesses(): Promise<Business[]> {
  try {
    if (!(await hasDatabase())) return demoBusinesses();
    const { db } = initAdmin();
    const snap = await db.collection("businesses").get();
    return snap.docs
      .map((doc) => asBusiness(doc.id, doc.data() || {}))
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  } catch (error) {
    console.error("getAllBusinesses", error);
    return [];
  }
}

export function pickBusinessForSlug(rows: Business[]): Business | null {
  return rows.find((row) => row.status === "live") || rows[0] || null;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  try {
    if (!(await hasDatabase())) {
      return pickBusinessForSlug(demoBusinesses().filter((row) => row.slug === slug));
    }
    const { db } = initAdmin();
    const snap = await db.collection("businesses").where("slug", "==", slug).get();
    if (snap.empty) return null;
    return pickBusinessForSlug(snap.docs.map((doc) => asBusiness(doc.id, doc.data() || {})));
  } catch (error) {
    console.error("getBusinessBySlug", error);
    return null;
  }
}

export async function getBusinessesBySlugs(slugs: string[]): Promise<Business[]> {
  const unique = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  const rows = await Promise.all(unique.map((slug) => getBusinessBySlug(slug)));
  return rows.filter((row): row is Business => row !== null && row.status === "live" && !isDemoListing(row));
}

export async function getBusiness(id: string): Promise<Business | null> {
  if (!(await hasDatabase())) {
    return demoBusinesses().find((row) => row.id === id) || null;
  }
  const { db } = initAdmin();
  const doc = await db.collection("businesses").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  return asBusiness(doc.id, data);
}

export async function getOwner(id: string): Promise<Owner | null> {
  if (!(await hasDatabase())) {
    return demoOwners().find((row) => row.id === id) || null;
  }
  const { db } = initAdmin();
  const doc = await db.collection("owners").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Owner, "id">) };
}

export async function getOwnerBySlug(slug: string): Promise<Owner | null> {
  if (!(await hasDatabase())) {
    return demoOwners().find((row) => row.slug === slug) || null;
  }
  const { db } = initAdmin();
  const snap = await db.collection("owners").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<Owner, "id">) };
}

export async function getBusinessesByOwner(ownerId: string, liveOnly = false) {
  if (!(await hasDatabase())) {
    return demoBusinesses().filter(
      (row) =>
        row.ownerId === ownerId &&
        (!liveOnly || row.status === "live") &&
        (!liveOnly || !isDemoListing(row)),
    );
  }
  const { db } = initAdmin();
  let query = db.collection("businesses").where("ownerId", "==", ownerId);
  if (liveOnly) query = query.where("status", "==", "live");
  const snap = await query.get();
  return snap.docs
    .map((doc) => asBusiness(doc.id, doc.data() || {}))
    .filter((row) => !liveOnly || !isDemoListing(row))
    .sort((a, b) => a.brandName.localeCompare(b.brandName));
}

export async function slugTaken(slug: string, exceptId?: string) {
  const { db } = initAdmin();
  const snap = await db.collection("businesses").where("slug", "==", slug).get();
  return snap.docs.some((doc) => doc.id !== exceptId);
}

export async function publishedSlugTaken(slug: string, exceptId?: string) {
  const { db } = initAdmin();
  const snap = await db.collection("businesses").where("slug", "==", slug).get();
  return snap.docs.some((doc) => {
    if (doc.id === exceptId) return false;
    return listingSlugReserved(doc.get("status") as Business["status"]);
  });
}

export async function allocatePublishedSlug(base: string, exceptId?: string) {
  if (!(await publishedSlugTaken(base, exceptId))) return base;
  const taken: string[] = [base];
  for (let n = 2; n <= 999; n++) {
    const candidate = `${base}-${n}`;
    if (await publishedSlugTaken(candidate, exceptId)) taken.push(candidate);
    else return nextAvailableSlug(base, taken);
  }
  return nextAvailableSlug(base, taken);
}

export async function ownerSlugTaken(slug: string, exceptId?: string) {
  const { db } = initAdmin();
  const snap = await db.collection("owners").where("slug", "==", slug).get();
  return snap.docs.some((doc) => doc.id !== exceptId);
}

export async function uenTaken(uen: string, exceptId?: string) {
  const value = uen.trim().toUpperCase();
  if (!value) return false;
  const { db } = initAdmin();
  const snap = await db.collection("businesses").where("uen", "==", value).get();
  return snap.docs.some((doc) => {
    if (doc.id === exceptId) return false;
    const status = doc.get("status");
    return status !== "removed";
  });
}

export async function getVerifications(businessId: string): Promise<Verification[]> {
  if (!(await hasDatabase())) return [];
  const { db } = initAdmin();
  const snap = await db
    .collection("verifications")
    .where("businessId", "==", businessId)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Verification, "id">) }))
    .sort((a, b) => (b.verifiedAt || b.createdAt).localeCompare(a.verifiedAt || a.createdAt));
}

export function publicBusiness(business: Business) {
  return {
    ...business,
    uenDownloadedAt:
      business.verificationType === "uen_document" ? business.uenDownloadedAt : null,
  };
}
