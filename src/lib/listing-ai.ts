import {
  extractPageColorHints,
  pickListingColors,
  type PageColorHints,
} from "@/lib/listing-colors";
import { emptyListingLinks, listingFieldsFromUrls, normalizeListingUrl, type ListingLinkValues } from "@/lib/listing-urls";
import { parsePhotos } from "@/lib/photos";
import { parseWhatsappNumber } from "@/lib/whatsapp";

export const LISTING_AI_NEED_SOURCE = "Paste a website, add photos, or both.";
export const LISTING_AI_BAD_URL = "Enter a public https website, such as https://example.sg.";
export const LISTING_AI_FETCH_FAIL = "We could not open that website. Check the address and try again.";
export const LISTING_AI_BLOCKED = "That address cannot be used. Paste a public company website.";

const UEN_RE = /\b(?:[0-9]{8,9}[A-Z]|(?:T|S|R)\d{2}[A-Z]{2}\d{4}[A-Z])\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

export type ListingAiDraft = {
  brandName: string;
  registeredName: string;
  uen: string;
  contactEmail: string;
  whatsapp: string;
  summary: string;
  description: string;
  address: string;
  locationMode: "online" | "pin";
  lat: number | null;
  lng: number | null;
  links: ListingLinkValues;
  photos: string[];
  primaryColor: string;
  secondaryColor: string;
};

export type PageHints = {
  title: string;
  description: string;
  text: string;
  emails: string[];
  phones: string[];
  uens: string[];
  links: ListingLinkValues;
} & PageColorHints;

export function parseSourceWebsite(raw: string): string {
  const url = normalizeListingUrl(raw);
  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error(LISTING_AI_BAD_URL);
  }
  const parsed = new URL(url);
  if (parsed.username || parsed.password) throw new Error(LISTING_AI_BLOCKED);
  if (isBlockedHostname(parsed.hostname)) throw new Error(LISTING_AI_BLOCKED);
  parsed.hash = "";
  return parsed.toString();
}

export function isBlockedHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return true;
  if (isPrivateIp(host)) return true;
  return false;
}

export function isPrivateIp(host: string) {
  if (host === "::1" || host === "0.0.0.0") return true;
  const v4 = host.startsWith("::ffff:") ? host.slice(7) : host;
  const parts = v4.split(".").map((item) => Number(item));
  if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

export function extractPageHints(html: string, pageUrl: string): PageHints {
  const title =
    attr(html, /property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
    attr(html, /content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
    tagText(html, "title");
  const description =
    attr(html, /property=["']og:description["'][^>]*content=["']([^"']+)/i) ||
    attr(html, /name=["']description["'][^>]*content=["']([^"']+)/i) ||
    "";
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = clipPageText(
    `${title} ${description} ${stripped.replace(/<[^>]+>/g, " ")}`,
  );
  const hrefs = [...stripped.matchAll(/href=["']([^"']+)["']/gi)].map((row) => row[1] || "");
  const links = emptyListingLinks();
  const origin = originOf(pageUrl);
  const mailFromHref: string[] = [];
  for (const href of hrefs) {
    if (href.toLowerCase().startsWith("mailto:")) {
      const email = href.slice(7).split("?")[0]?.trim().toLowerCase();
      if (email) mailFromHref.push(email);
      continue;
    }
    const absolute = absolutize(href, origin);
    if (!absolute) continue;
    const slot = slotForHref(absolute);
    if (slot && !links[slot]) links[slot] = absolute;
  }
  if (!links.website) links.website = origin || pageUrl;
  const emails = unique(
    [
      ...mailFromHref,
      ...[...text.matchAll(EMAIL_RE)].map((row) => row[0].toLowerCase()),
    ].filter((email) => email.includes("@") && !email.endsWith(".png")),
  );
  const phones = unique(
    [...stripped.matchAll(/(?:wa\.me\/|whatsapp\.com\/send\?phone=)(\d{8,15})/gi)].map(
      (row) => parseWhatsappNumber(row[1]) || "",
    ).filter(Boolean),
  );
  const tel = [...stripped.matchAll(/href=["']tel:([^"']+)["']/gi)]
    .map((row) => parseWhatsappNumber(row[1]) || "")
    .filter(Boolean);
  const uens = unique([...(text.toUpperCase().match(UEN_RE) || [])]);
  const colors = extractPageColorHints(html);
  return {
    title: decode(title).slice(0, 120),
    description: decode(description).slice(0, 280),
    text,
    emails,
    phones: unique([...phones, ...tel]),
    uens,
    links,
    themeColor: colors.themeColor,
    palette: colors.palette,
  };
}

export function sameOriginStylesheetUrls(html: string, pageUrl: string, max = 2) {
  const origin = originOf(pageUrl);
  if (!origin) return [];
  const out: string[] = [];
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const raw = tag[0];
    if (!/\bstylesheet\b/i.test(raw)) continue;
    const href = raw.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const absolute = absolutize(href, origin);
    if (!absolute) continue;
    try {
      const url = new URL(absolute);
      if (url.origin !== origin || url.protocol !== "https:") continue;
      if (out.includes(url.toString())) continue;
      out.push(url.toString());
    } catch {
      continue;
    }
  }
  return out.slice(0, max);
}

export function clipPageText(value: string, max = 12000) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function emptyPageHints(): PageHints {
  return {
    title: "",
    description: "",
    text: "",
    emails: [],
    phones: [],
    uens: [],
    links: emptyListingLinks(),
    themeColor: null,
    palette: [],
  };
}

export function emptyListingAiDraft(photos: string[] = []): ListingAiDraft {
  return {
    brandName: "",
    registeredName: "",
    uen: "",
    contactEmail: "",
    whatsapp: "",
    summary: "",
    description: "",
    address: "",
    locationMode: "online",
    lat: null,
    lng: null,
    links: emptyListingLinks(),
    photos: parsePhotos(photos),
    primaryColor: "",
    secondaryColor: "",
  };
}

export function heuristicListingDraft(hints: PageHints, photos: string[], website: string): ListingAiDraft {
  const brandName = cleanBrand(hints.title) || hostnameBrand(website);
  const summary = (hints.description || hints.text).slice(0, 280);
  const description = hints.text.slice(0, 4000);
  const links = { ...hints.links };
  if (website && !links.website) links.website = website;
  const colors = pickListingColors(hints);
  return {
    brandName,
    registeredName: "",
    uen: hints.uens[0] || "",
    contactEmail: hints.emails[0] || "",
    whatsapp: hints.phones[0] || "",
    summary,
    description,
    address: "",
    locationMode: "online",
    lat: null,
    lng: null,
    links,
    photos: parsePhotos(photos),
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
  };
}

export function parseListingAiJson(
  raw: unknown,
  hints: PageHints,
  photos: string[],
  website: string,
): ListingAiDraft {
  const fallback = heuristicListingDraft(hints, photos, website);
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const linksIn = data.links && typeof data.links === "object" ? (data.links as Record<string, unknown>) : {};
  const fromModel = listingFieldsFromUrls(
    Object.entries({
      website: String(linksIn.website || ""),
      instagram: String(linksIn.instagram || ""),
      facebook: String(linksIn.facebook || ""),
      tiktok: String(linksIn.tiktok || ""),
    }).flatMap(([label, url]) => {
      const normalized = normalizeListingUrl(String(url));
      return normalized ? [{ label: label[0]!.toUpperCase() + label.slice(1), url: normalized }] : [];
    }),
  );
  const fromPhotos = photos.length > 0;
  const uen = pickKnownUen(str(data.uen), hints.uens, fromPhotos);
  const whatsapp = parseWhatsappNumber(str(data.whatsapp)) || fallback.whatsapp;
  const locationMode = data.locationMode === "pin" ? "pin" : "online";
  const colors = pickListingColors(
    hints,
    {
      primaryColor: str(data.primaryColor),
      secondaryColor: str(data.secondaryColor),
    },
    { allowPreferred: fromPhotos },
  );
  return {
    brandName: str(data.brandName).slice(0, 120) || fallback.brandName,
    registeredName: str(data.registeredName).slice(0, 160),
    uen,
    contactEmail: emailOrEmpty(str(data.contactEmail)) || fallback.contactEmail,
    whatsapp: whatsapp || "",
    summary: str(data.summary).slice(0, 280) || fallback.summary,
    description: str(data.description).slice(0, 8000) || fallback.description,
    address: str(data.address).slice(0, 200),
    locationMode,
    lat: null,
    lng: null,
    links: {
      website: fromModel.website || fallback.links.website || website,
      instagram: fromModel.instagram || fallback.links.instagram,
      facebook: fromModel.facebook || fallback.links.facebook,
      tiktok: fromModel.tiktok || fallback.links.tiktok,
    },
    photos: parsePhotos(photos),
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
  };
}

function pickKnownUen(candidate: string, found: string[], allowFromPhotos = false) {
  const value = candidate.trim().toUpperCase();
  if (value && found.includes(value)) return value;
  if (allowFromPhotos && looksLikeUen(value)) return value;
  return found[0] || "";
}

function looksLikeUen(value: string) {
  return /^(?:[0-9]{8,9}[A-Z]|(?:T|S|R)\d{2}[A-Z]{2}\d{4}[A-Z])$/.test(value);
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function emailOrEmpty(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : "";
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function attr(html: string, pattern: RegExp) {
  return decode(html.match(pattern)?.[1] || "");
}

function tagText(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return decode((match?.[1] || "").replace(/<[^>]+>/g, " "));
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function originOf(pageUrl: string) {
  try {
    return new URL(pageUrl).origin;
  } catch {
    return "";
  }
}

function absolutize(href: string, origin: string) {
  const raw = href.trim();
  if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) {
    return "";
  }
  try {
    return new URL(raw, origin || undefined).toString();
  } catch {
    return "";
  }
}

function slotForHref(url: string): keyof ListingLinkValues | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
    if (host.includes("tiktok.com")) return "tiktok";
  } catch {
    return null;
  }
  return null;
}

function cleanBrand(title: string) {
  return title.split(/[|–—-]/)[0]?.trim().slice(0, 120) || "";
}

function hostnameBrand(website: string) {
  try {
    return new URL(website).hostname.replace(/^www\./, "").split(".")[0] || "";
  } catch {
    return "";
  }
}
