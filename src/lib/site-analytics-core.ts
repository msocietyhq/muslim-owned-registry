export const SITE_VISIT_DWELL_MS = 60_000;
export const SITE_SEEN_COLLECTION = "site_seen";
export const VISIT_SESSION_STORAGE = "mosg_visit_session";
export const VISIT_VISIBLE_STORAGE = "mosg_visit_visible_ms";
export const VISIT_QUALIFIED_STORAGE = "mosg_visit_qualified";

const PRIVATE_PREFIXES = ["/admin", "/app", "/login", "/m"];

export type SiteVisitorStats = {
  uniqueVisitors: number;
  totalVisitors: number;
};

export function emptySiteVisitorStats(): SiteVisitorStats {
  return { uniqueVisitors: 0, totalVisitors: 0 };
}

export function isPublicAnalyticsPath(pathname: string) {
  const path = pathname.split("?")[0] || "/";
  return !PRIVATE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function shouldQualifyVisit(visibleMs: number, alreadyQualified: boolean) {
  return !alreadyQualified && visibleMs >= SITE_VISIT_DWELL_MS;
}

export function addVisibleTime(
  currentMs: number,
  elapsedMs: number,
  isVisible: boolean,
) {
  if (!isVisible || elapsedMs <= 0) return Math.max(0, currentMs);
  return Math.max(0, currentMs) + elapsedMs;
}

export function siteSessionSeenId(sessionId: string) {
  return `session_${sessionId}`;
}

export function siteUniqueSeenId(visitorId: string) {
  return `unique_${visitorId}`;
}
