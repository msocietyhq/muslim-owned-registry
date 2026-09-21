import {
  parseVisitorId,
  VISITOR_COOKIE,
  VISITOR_STORAGE,
  visitorCookieOptions,
} from "@/lib/visitor";

function readVisitorCookie() {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (!part.startsWith(`${VISITOR_COOKIE}=`)) continue;
    return parseVisitorId(decodeURIComponent(part.slice(VISITOR_COOKIE.length + 1)));
  }
  return null;
}

function persistVisitorId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITOR_STORAGE, id);
  } catch {
    /* private mode */
  }
  const options = visitorCookieOptions();
  const secure = options.secure ? "; Secure" : "";
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=${options.sameSite}${secure}`;
}

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  let stored: string | null = null;
  try {
    stored = parseVisitorId(window.localStorage.getItem(VISITOR_STORAGE));
  } catch {
    stored = null;
  }
  const existing = readVisitorCookie() || stored;
  if (existing) {
    persistVisitorId(existing);
    return existing;
  }
  const id = crypto.randomUUID();
  persistVisitorId(id);
  return id;
}
