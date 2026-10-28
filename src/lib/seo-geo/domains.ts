import type { Business } from "@/lib/types";

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "linktr.ee",
  "linktree.com",
  "wa.me",
  "whatsapp.com",
  "t.me",
  "telegram.me",
  "telegram.org",
  "threads.net",
  "pinterest.com",
  "snapchat.com",
  "reddit.com",
  "discord.com",
  "discord.gg",
  "beacons.ai",
  "bio.link",
  "carrd.co",
  "maps.google.com",
  "goo.gl",
];

export type EligibleDomain = {
  domain: string;
  businessId: string;
  brandName: string;
};

export function websiteHost(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.username || url.password) return null;
    let host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("www.")) host = host.slice(4);
    if (!host.includes(".") || host.includes(" ")) return null;
    return host;
  } catch {
    return null;
  }
}

export function isSocialHost(host: string) {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return SOCIAL_HOSTS.some(
    (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`),
  );
}

export function eligibleDomains(businesses: Business[]): EligibleDomain[] {
  const seen = new Set<string>();
  const rows: EligibleDomain[] = [];
  for (const business of businesses) {
    if (business.status !== "live" || business.isDemo === true) continue;
    for (const pair of business.urls || []) {
      const host = websiteHost(pair.url);
      if (!host || isSocialHost(host) || seen.has(host)) continue;
      seen.add(host);
      rows.push({
        domain: host,
        businessId: business.id,
        brandName: business.brandName,
      });
    }
  }
  return rows.sort((a, b) => a.domain.localeCompare(b.domain));
}

export function matchEligibleDomain(raw: string, allowed: EligibleDomain[]) {
  const host = websiteHost(raw);
  if (!host) return { ok: false as const, reason: "invalid" as const };
  if (isSocialHost(host)) return { ok: false as const, reason: "social" as const };
  const match = allowed.find((row) => row.domain === host);
  if (!match) return { ok: false as const, reason: "unlisted" as const };
  return { ok: true as const, match };
}
