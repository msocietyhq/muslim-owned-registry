export type BusinessStatus =
  | "draft"
  | "pending_review"
  | "pending_activation"
  | "live"
  | "unpublished"
  | "removed";

export type VerificationType = "uen_document" | "linkedin";

export type HistoryOp = "create" | "update" | "delete";

export type HistoryActorRole = "admin" | "owner" | "system" | "listing-link";

export type HistoryActor = {
  id: string;
  email: string | null;
  name: string | null;
  role: HistoryActorRole;
};

export type UrlPair = {
  url: string;
  label: string;
};

export type Owner = {
  id: string;
  displayName: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
};

export type Business = {
  id: string;
  ownerId: string;
  uen: string;
  registeredName: string;
  brandName: string;
  slug: string;
  contactEmail: string;
  /** Public WhatsApp number as country code + digits, no plus. */
  whatsapp: string | null;
  /** Optional prefilled WhatsApp chat text. */
  whatsappTemplate: string | null;
  summary: string;
  /** Optional longer markdown about the business. */
  description: string;
  urls: UrlPair[];
  tagIds: string[];
  /** Public photos. Max 5. */
  photos: string[];
  /** Public operate/ship-from pin. Both null for an online business. */
  lat: number | null;
  lng: number | null;
  /** Optional written street address shown on the public listing. */
  address: string;
  /** Admin comment from the last rejection, shown until the owner resubmits. */
  lastAdminNote: string | null;
  status: BusinessStatus;
  verificationType: VerificationType;
  linkedinUrl: string | null;
  uenDownloadedAt: string | null;
  lastConfirmedAt: string | null;
  confirmationDueAt: string | null;
  lastReminderAt: string | null;
  termsAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
  /** Firestore `is_demo`. true = sample listing, false = real, null = unset. */
  isDemo: boolean | null;
  /** 1–100 when this non-demo listing was among the first 100 submitted. */
  foundingSlot: number | null;
  /** Homepage 1.8× weight ends at this ISO time (first approval + 365 days). */
  featuredUntil: string | null;
  /** Optional listing page brand colour. Null keeps the site default. */
  primaryColor: string | null;
  /** Optional second listing page colour. Ignored unless primaryColor is set. */
  secondaryColor: string | null;
};

export type PublicBusiness = Omit<Business, never> & {
  tagNames: string[];
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type Verification = {
  id: string;
  businessId: string;
  type: VerificationType;
  email: string;
  verificationUrl: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type AdminTaskType = "listing_verification" | "reconfirmation_overdue";

export type AdminTask = {
  id: string;
  type: AdminTaskType;
  status: "open" | "done" | "rejected";
  businessId: string;
  ownerId: string;
  payload: Record<string, unknown>;
  uenStoragePath: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

export type HistoryRow = {
  id: string;
  recordId: string;
  op: HistoryOp;
  snapshot: Record<string, unknown>;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: HistoryActorRole | null;
};

export function parseDemoFlag(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function isDemoListing(business: { isDemo: boolean | null }) {
  return business.isDemo === true;
}

export function excludeDemoListings<T extends { isDemo: boolean | null }>(rows: T[]) {
  return rows.filter((row) => !isDemoListing(row));
}

export type ListingStats = {
  uniqueViews: number;
  uniqueImpressions: number;
  clicks: number;
};

export const TERMS_VERSION = "2026-09-20";
export const CONFIRMATION_MONTHS = 4;
export const CONFIRMATION_REMINDER_DAYS = 7;
export const CONFIRMATION_UNPUBLISH_AFTER_DAYS = 21;
export const MAX_PHOTOS = 5;
export const ADDRESS_MAX = 200;

export function parseAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, ADDRESS_MAX);
}
