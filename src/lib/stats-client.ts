export const SEARCH_COUNTED_COOKIE = "mosg_counted_search";
export const SEARCH_COUNTED_STORAGE = "mosg_counted_search";
export const SEARCH_COUNT_PUBLIC_MIN = 200;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function withCount(template: string, n: number) {
  const value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return template.replace("{n}", new Intl.NumberFormat("en-SG").format(value));
}

export function publicSearchCountLabel(template: string, n: number) {
  const value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (value < SEARCH_COUNT_PUBLIC_MIN) return undefined;
  return withCount(template, value);
}

export function shouldCountSearch(cookieValue: string | undefined, countSearch: boolean) {
  return countSearch && cookieValue !== "1";
}

export function searchCountedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function hasCountedSearch() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SEARCH_COUNTED_STORAGE) === "1";
  } catch {
    return false;
  }
}

export function markCountedSearch() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEARCH_COUNTED_STORAGE, "1");
  } catch {
    /* private mode */
  }
}
