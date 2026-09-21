export const WISHLIST_KEY = "mosg_saved_slugs";
export const WISHLIST_EVENT = "mosg-wishlist";

function readSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function writeSlugs(slugs: string[]) {
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify([...new Set(slugs)]));
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

export function listSavedSlugs() {
  return readSlugs();
}

export function isSavedSlug(slug: string) {
  return readSlugs().includes(slug);
}

export function toggleSavedSlug(slug: string) {
  const current = readSlugs();
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  writeSlugs(next);
  return next.includes(slug);
}
