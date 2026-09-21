import { markdownPlainText } from "@/lib/markdown";

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function searchTokens(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter((part) => part.length >= 3);
}

export function listingSearchBlob(fields: Array<string | null | undefined>) {
  return normalizeSearchText(fields.filter(Boolean).join(" "));
}

export function listingMatchesQuery(query: string, fields: Array<string | null | undefined>) {
  const hay = listingSearchBlob(fields);
  if (!hay) return false;
  const compact = normalizeSearchText(query);
  if (compact.length >= 3 && hay.includes(compact)) return true;
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  return tokens.every((token) => hay.includes(token));
}

export function listingTextFields(item: {
  brandName: string;
  registeredName?: string | null;
  summary?: string | null;
  description?: string | null;
  tags?: string[];
}) {
  return [
    item.brandName,
    item.registeredName,
    item.summary,
    markdownPlainText(item.description || ""),
    ...(item.tags || []),
  ];
}

/** Brand and company-name hits rank far above a word buried in the description. */
export function listingMatchScore(
  query: string,
  item: {
    brandName: string;
    registeredName?: string | null;
    summary?: string | null;
    description?: string | null;
    tags?: string[];
  },
) {
  const compact = normalizeSearchText(query);
  if (!compact) return 0;
  const brand = normalizeSearchText(item.brandName);
  const registered = normalizeSearchText(item.registeredName || "");
  const summary = normalizeSearchText(item.summary || "");
  const description = normalizeSearchText(markdownPlainText(item.description || ""));
  const tags = normalizeSearchText((item.tags || []).join(" "));
  let score = 0;
  if (brand === compact || registered === compact) score += 1000;
  else if (brand.startsWith(compact) || registered.startsWith(compact)) score += 800;
  else if (brand.includes(compact) || registered.includes(compact)) score += 600;
  if (compact.length >= 2 && tags.includes(compact)) score += 80;
  if (compact.length >= 3 && summary.includes(compact)) score += 120;
  if (compact.length >= 3 && description.includes(compact)) score += 30;
  for (const token of searchTokens(query)) {
    if (brand.includes(token) || registered.includes(token)) score += 140;
    else if (tags.includes(token)) score += 50;
    else if (summary.includes(token)) score += 35;
    else if (description.includes(token)) score += 10;
  }
  return score;
}

export const CLOSE_MATCH_SCORE = 500;

function identityKeys(item: { slug: string; brandName: string; registeredName?: string | null }) {
  const keys = [`slug:${item.slug}`];
  const brand = normalizeSearchText(item.brandName);
  if (brand) keys.push(`brand:${brand}`);
  const registered = normalizeSearchText(item.registeredName || "");
  if (registered && registered !== brand) keys.push(`registered:${registered}`);
  return keys;
}

export function uniqueListings<T extends { slug: string; brandName: string; registeredName?: string | null }>(
  items: T[],
) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    const keys = identityKeys(item);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    unique.push(item);
  }
  return unique;
}
