import type { HistoryActorRole, HistoryOp } from "@/lib/types";
import { formatWhatsappDisplay } from "@/lib/whatsapp";

export type HistoryAuthorRow = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function historyAuthorIdentity(
  row: HistoryAuthorRow,
  options?: { hideEmail?: boolean },
): {
  role: HistoryActorRole | "unknown";
  author: string;
} {
  const role = (row.actorRole || inferRole(row.actorId)) as HistoryActorRole | "unknown";
  const name = row.actorName?.trim() || "";
  const email = row.actorEmail?.trim() || "";
  let author = "";
  if (options?.hideEmail) {
    author = name && !looksLikeEmail(name) ? name : "";
  } else if (name && email && name.toLowerCase() !== email.toLowerCase()) {
    author = `${name} (${email})`;
  } else {
    author = email || name || row.actorId || "";
  }
  if (!author && (role === "system" || row.actorId === "system")) {
    author = "muslimowned.sg";
  }
  return { role: role || "unknown", author };
}

function inferRole(actorId?: string | null): HistoryActorRole | "unknown" {
  if (actorId === "system") return "system";
  if (actorId === "listing-link") return "listing-link";
  if (!actorId) return "unknown";
  return "unknown";
}

function fillAuthor(template: string, author: string, fallback: string) {
  if (author) return template.replace("{author}", author);
  const without = template.replace("{author}", "").replace(/\s+/g, " ").trim();
  return without || fallback;
}

export function historyAuthorPhrase(
  row: HistoryAuthorRow,
  copy: {
    byAdmin: string;
    byOwner: string;
    bySystem: string;
    byLink: string;
    byUnknown: string;
  },
  options?: { hideEmail?: boolean },
) {
  const { role, author } = historyAuthorIdentity(row, options);
  if (role === "admin") {
    return fillAuthor(copy.byAdmin, author, copy.byAdmin.replace("{author}", "admin"));
  }
  if (role === "owner") {
    return fillAuthor(copy.byOwner, author, copy.byOwner.replace("{author}", "owner"));
  }
  if (role === "system") return copy.bySystem;
  if (role === "listing-link") return copy.byLink;
  if (author) return copy.byUnknown.replace("{author}", author);
  return fillAuthor(copy.byUnknown, "", copy.byUnknown.replace("{author}", "unknown"));
}

/** Timestamps that always bump on save and are not a public listing edit. */
const WRITE_IGNORE_KEYS = new Set(["updatedAt"]);

/** Internal or private keys visitors should not see in public history diffs. */
const DISPLAY_HIDE_KEYS = new Set([
  "id",
  "ownerId",
  "createdAt",
  "updatedAt",
  "lastConfirmedAt",
  "confirmationDueAt",
  "lastReminderAt",
  "lastAdminNote",
  "termsAcceptedAt",
  "uenDownloadedAt",
  "uenStoragePath",
  "isDemo",
  "is_demo",
  "foundingSlot",
  "featuredUntil",
  "lat",
  "lng",
]);

const FIELD_ORDER = [
  "brandName",
  "registeredName",
  "uen",
  "slug",
  "contactEmail",
  "whatsapp",
  "whatsappTemplate",
  "summary",
  "description",
  "urls",
  "tagIds",
  "photos",
  "address",
  "mapPin",
  "verificationType",
  "linkedinUrl",
  "primaryColor",
  "secondaryColor",
  "status",
] as const;

export type HistoryDiffCopy = {
  historyChange: string;
  historyBlank: string;
  historyPhotosCount: string;
  historyPhotosOne: string;
  historyPhotosNone: string;
  historyPhotosReplaced: string;
  historyUrlsNone: string;
  historyTagsNone: string;
  historyMapOnline: string;
  historyVerificationUen: string;
  historyVerificationLinkedin: string;
  historyFields: {
    brandName: string;
    registeredName: string;
    uen: string;
    slug: string;
    contactEmail: string;
    whatsapp: string;
    whatsappTemplate: string;
    summary: string;
    description: string;
    urls: string;
    tags: string;
    photos: string;
    address: string;
    mapPin: string;
    status: string;
    verificationType: string;
    linkedinUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
};

export type HistoryDiff = {
  key: string;
  label: string;
  from: string;
  to: string;
  line: string;
};

export type HistoryDiffContext = {
  copy: HistoryDiffCopy;
  statusLabels: Record<string, string>;
  tagNames?: Map<string, string>;
};

export function snapshotsMatch(
  previous?: Record<string, unknown> | null,
  next?: Record<string, unknown> | null,
) {
  return stableStringify(forWriteCompare(previous)) === stableStringify(forWriteCompare(next));
}

export function shouldWriteHistory(
  op: HistoryOp | string,
  previous?: Record<string, unknown> | null,
  next?: Record<string, unknown> | null,
) {
  if (op !== "update") return true;
  if (!previous) return true;
  return !snapshotsMatch(previous, next);
}

export function snapshotDiffs(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
  ctx: HistoryDiffContext,
): HistoryDiff[] {
  const before = forDisplayCompare(previous);
  const after = forDisplayCompare(next);
  const keys = orderedKeys(new Set([...Object.keys(before), ...Object.keys(after)]));
  const diffs: HistoryDiff[] = [];
  for (const key of keys) {
    if (stableStringify(before[key]) === stableStringify(after[key])) continue;
    const label = fieldLabel(key, ctx.copy);
    const from = formatHistoryValue(key, before[key], ctx);
    const to = formatHistoryValue(key, after[key], ctx, before[key]);
    diffs.push({
      key,
      label,
      from,
      to,
      line: ctx.copy.historyChange.replace("{field}", label).replace("{from}", from).replace("{to}", to),
    });
  }
  return diffs;
}

type HistoryViewRow = HistoryAuthorRow & {
  id: string;
  op: string;
  createdAt: string;
  snapshot?: Record<string, unknown>;
};

export type ListingHistoryViewItem = HistoryViewRow & {
  diffs: HistoryDiff[];
};

/** Newest-first rows. Hides no-op saves that only bump timestamps. */
export function listingHistoryView(rows: HistoryViewRow[], ctx: HistoryDiffContext): ListingHistoryViewItem[] {
  return rows.flatMap((row, index) => {
    const older = rows[index + 1];
    if (row.op === "create" || row.op === "delete") {
      return [{ ...row, diffs: [] }];
    }
    if (!older?.snapshot) {
      return [{ ...row, diffs: [] }];
    }
    const diffs = snapshotDiffs(older.snapshot, row.snapshot, ctx);
    if (!diffs.length) return [];
    return [{ ...row, diffs }];
  });
}

function forWriteCompare(snapshot?: Record<string, unknown> | null) {
  return normalizeLeaves(omitKeys(snapshot, WRITE_IGNORE_KEYS)) as Record<string, unknown>;
}

function forDisplayCompare(snapshot?: Record<string, unknown> | null) {
  const copy = omitKeys(snapshot, DISPLAY_HIDE_KEYS);
  copy.mapPin = mapPinValue(snapshot);
  return normalizeLeaves(copy) as Record<string, unknown>;
}

function omitKeys(snapshot: Record<string, unknown> | null | undefined, keys: Set<string>) {
  const copy: Record<string, unknown> = {};
  if (!snapshot) return copy;
  for (const [key, value] of Object.entries(snapshot)) {
    if (keys.has(key)) continue;
    copy[key] = value;
  }
  return copy;
}

function mapPinValue(snapshot?: Record<string, unknown> | null) {
  const lat = snapshot?.lat;
  const lng = snapshot?.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  return null;
}

function normalizeLeaves(value: unknown): unknown {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return value.map((item) => normalizeLeaves(item));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, normalizeLeaves(item)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    const copy: Record<string, unknown> = {};
    for (const [key, item] of entries) copy[key] = item;
    return copy;
  }
  if (typeof value === "string") return value.trim();
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeLeaves(value));
}

function orderedKeys(keys: Set<string>) {
  const rest = [...keys].filter((key) => !FIELD_ORDER.includes(key as (typeof FIELD_ORDER)[number])).sort();
  return [...FIELD_ORDER.filter((key) => keys.has(key)), ...rest];
}

function fieldLabel(key: string, copy: HistoryDiffCopy) {
  if (key === "tagIds") return copy.historyFields.tags;
  if (key in copy.historyFields) {
    return copy.historyFields[key as keyof HistoryDiffCopy["historyFields"]];
  }
  return key;
}

function formatHistoryValue(
  key: string,
  value: unknown,
  ctx: HistoryDiffContext,
  compareTo?: unknown,
) {
  if (key === "status") {
    const raw = typeof value === "string" ? value : "";
    if (!raw) return ctx.copy.historyBlank;
    return ctx.statusLabels[raw] || raw.replace(/_/g, " ");
  }
  if (key === "mapPin") {
    return typeof value === "string" && value ? value : ctx.copy.historyMapOnline;
  }
  if (key === "photos") {
    return formatPhotos(value, ctx.copy, compareTo);
  }
  if (key === "urls") {
    return formatUrls(value, ctx.copy);
  }
  if (key === "tagIds") {
    return formatTags(value, ctx);
  }
  if (key === "whatsapp") {
    if (typeof value !== "string" || !value) return ctx.copy.historyBlank;
    return formatWhatsappDisplay(value);
  }
  if (key === "verificationType") {
    if (value === "linkedin") return ctx.copy.historyVerificationLinkedin;
    if (value === "uen_document") return ctx.copy.historyVerificationUen;
    return typeof value === "string" && value ? value : ctx.copy.historyBlank;
  }
  if (value == null || value === "") return ctx.copy.historyBlank;
  if (typeof value === "string") return clip(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return clip(JSON.stringify(value) || ctx.copy.historyBlank);
}

function formatPhotos(value: unknown, copy: HistoryDiffCopy, compareTo?: unknown) {
  const next = Array.isArray(value) ? value.map(String) : [];
  if (!next.length) return copy.historyPhotosNone;
  const previous = Array.isArray(compareTo) ? compareTo.map(String) : [];
  if (previous.length === next.length && stableStringify(previous) !== stableStringify(next)) {
    return copy.historyPhotosReplaced.replace("{n}", String(next.length));
  }
  if (next.length === 1) return copy.historyPhotosOne;
  return copy.historyPhotosCount.replace("{n}", String(next.length));
}

function formatUrls(value: unknown, copy: HistoryDiffCopy) {
  if (!Array.isArray(value) || !value.length) return copy.historyUrlsNone;
  const parts = value.map((item) => {
    if (!item || typeof item !== "object") return String(item);
    const row = item as { label?: unknown; url?: unknown };
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (label && url) return `${label} (${url})`;
    return url || label;
  }).filter(Boolean);
  return parts.length ? clip(parts.join("; ")) : copy.historyUrlsNone;
}

function formatTags(value: unknown, ctx: HistoryDiffContext) {
  if (!Array.isArray(value) || !value.length) return ctx.copy.historyTagsNone;
  const names = value.map((id) => {
    const key = String(id);
    return ctx.tagNames?.get(key) || key;
  });
  return clip(names.join(", "));
}

function clip(text: string, max = 160) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}
