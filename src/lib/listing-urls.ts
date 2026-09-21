import type { UrlPair } from "@/lib/types";

export const LISTING_LINK_SLOTS = [
  { id: "website", label: "Website" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
] as const;

export type ListingLinkId = (typeof LISTING_LINK_SLOTS)[number]["id"];

export type ListingLinkValues = Record<ListingLinkId, string>;

export function emptyListingLinks(): ListingLinkValues {
  return { website: "", instagram: "", facebook: "", tiktok: "" };
}

export function normalizeListingUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function listingUrlsFromFields(values: ListingLinkValues): UrlPair[] {
  const urls: UrlPair[] = [];
  for (const slot of LISTING_LINK_SLOTS) {
    const url = normalizeListingUrl(values[slot.id]);
    if (!url) continue;
    urls.push({ url, label: slot.label });
  }
  return urls;
}

function slotForPair(pair: UrlPair): ListingLinkId | null {
  const label = pair.label.trim().toLowerCase();
  const host = (() => {
    try {
      return new URL(pair.url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (label === "instagram" || host.includes("instagram.com")) return "instagram";
  if (label === "facebook" || host.includes("facebook.com") || host.includes("fb.com")) {
    return "facebook";
  }
  if (label === "tiktok" || host.includes("tiktok.com")) return "tiktok";
  if (label === "website" || label === "site" || label === "web") return "website";
  return null;
}

export function listingFieldsFromUrls(urls: UrlPair[]): ListingLinkValues {
  const next = emptyListingLinks();
  for (const pair of urls) {
    const slot = slotForPair(pair) || (next.website ? null : "website");
    if (!slot || next[slot]) continue;
    next[slot] = pair.url;
  }
  return next;
}
