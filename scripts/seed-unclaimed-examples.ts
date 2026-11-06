import { randomUUID } from "crypto";
import { toBusinessDoc } from "../src/lib/data";
import type { Business } from "../src/lib/types";

const examples: Array<Omit<Business, "id" | "createdAt" | "updatedAt" | "termsAcceptedAt"> & { tagSlug: string }> = [
  {
    ownerId: "",
    uen: "T99EX0001A",
    registeredName: "Example Harbour Kopi Pte. Ltd.",
    brandName: "Example Harbour Kopi",
    slug: "example-harbour-kopi",
    contactEmail: "hello@example-harbour-kopi.test",
    whatsapp: null,
    whatsappTemplate: null,
    summary: "Example unclaimed listing for a neighbourhood coffee shop. Not a checked claim.",
    description:
      "This is an example page so you can see an unclaimed listing in Food. Nobody has claimed it, and it is not a checked statement that the business is Muslim-owned.",
    urls: [{ url: "https://example.com/harbour-kopi", label: "Website" }],
    tagIds: [],
    tagSlug: "food",
    photos: [],
    lat: 1.283,
    lng: 103.851,
    address: "Marina Bay, Singapore",
    lastAdminNote: null,
    status: "live",
    verificationType: "uen_document",
    linkedinUrl: null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    isDemo: false,
    foundingSlot: null,
    featuredUntil: null,
    primaryColor: null,
    secondaryColor: null,
    supersedesBusinessId: null,
    unclaimed: false,
  },
  {
    ownerId: "",
    uen: "T99EX0002B",
    registeredName: "Example Bedok Tuition Room Pte. Ltd.",
    brandName: "Example Bedok Tuition Room",
    slug: "example-bedok-tuition-room",
    contactEmail: "hello@example-bedok-tuition.test",
    whatsapp: null,
    whatsappTemplate: null,
    summary: "Example unclaimed listing for a small tuition room. Not a checked claim.",
    description:
      "This is an example page so you can see an unclaimed listing in Education. Nobody has claimed it, and it is not a checked statement that the business is Muslim-owned.",
    urls: [{ url: "https://example.com/bedok-tuition", label: "Website" }],
    tagIds: [],
    tagSlug: "education",
    photos: [],
    lat: 1.324,
    lng: 103.93,
    address: "Bedok, Singapore",
    lastAdminNote: null,
    status: "live",
    verificationType: "uen_document",
    linkedinUrl: null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    isDemo: false,
    foundingSlot: null,
    featuredUntil: null,
    primaryColor: null,
    secondaryColor: null,
    supersedesBusinessId: null,
    unclaimed: false,
  },
  {
    ownerId: "",
    uen: "T99EX0003C",
    registeredName: "Example Geylang Wellness Pte. Ltd.",
    brandName: "Example Geylang Wellness",
    slug: "example-geylang-wellness",
    contactEmail: "hello@example-geylang-wellness.test",
    whatsapp: null,
    whatsappTemplate: null,
    summary: "Example unclaimed listing for a wellness practice. Not a checked claim.",
    description:
      "This is an example page so you can see an unclaimed listing in Health. Nobody has claimed it, and it is not a checked statement that the business is Muslim-owned.",
    urls: [{ url: "https://example.com/geylang-wellness", label: "Website" }],
    tagIds: [],
    tagSlug: "health",
    photos: [],
    lat: 1.311,
    lng: 103.882,
    address: "Geylang, Singapore",
    lastAdminNote: null,
    status: "live",
    verificationType: "uen_document",
    linkedinUrl: null,
    uenDownloadedAt: null,
    lastConfirmedAt: null,
    confirmationDueAt: null,
    lastReminderAt: null,
    isDemo: false,
    foundingSlot: null,
    featuredUntil: null,
    primaryColor: null,
    secondaryColor: null,
    supersedesBusinessId: null,
    unclaimed: false,
  },
];

async function main() {
  const { initAdmin } = await import("../src/lib/firebase/admin");
  const { db } = initAdmin();
  const tags = await db.collection("tags").get();
  const bySlug = new Map(tags.docs.map((doc) => [String(doc.get("slug") || doc.id), doc.id]));
  const now = new Date().toISOString();

  for (const example of examples) {
    const existing = await db.collection("businesses").where("slug", "==", example.slug).get();
    if (!existing.empty) {
      console.log(`skip ${example.slug}`);
      continue;
    }
    const tagId = bySlug.get(example.tagSlug);
    if (!tagId) throw new Error(`Missing tag ${example.tagSlug}`);
    const { tagSlug: _tag, ...fields } = example;
    const id = randomUUID();
    const business: Business = {
      ...fields,
      id,
      tagIds: [tagId],
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("businesses").doc(id).set(toBusinessDoc(business));
    console.log(`created ${example.slug} ${id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
