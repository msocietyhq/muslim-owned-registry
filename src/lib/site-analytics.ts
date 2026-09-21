import { after } from "next/server";
import { canReadFirestore } from "@/lib/data";
import { FieldValue } from "@/lib/db/documents";
import { initAdmin } from "@/lib/firebase/admin";
import { STATS_DOC } from "@/lib/stats";
import {
  emptySiteVisitorStats,
  SITE_SEEN_COLLECTION,
  siteSessionSeenId,
  siteUniqueSeenId,
  type SiteVisitorStats,
} from "@/lib/site-analytics-core";
import { parseVisitorId } from "@/lib/visitor";

export type SiteVisitEvent = {
  visitorId: string;
  sessionId: string;
};

export {
  emptySiteVisitorStats,
  isPublicAnalyticsPath,
  shouldQualifyVisit,
  SITE_VISIT_DWELL_MS,
} from "@/lib/site-analytics-core";
export type { SiteVisitorStats } from "@/lib/site-analytics-core";

export function publishSiteVisit(event: SiteVisitEvent) {
  const visitorId = parseVisitorId(event.visitorId);
  const sessionId = parseVisitorId(event.sessionId);
  if (!visitorId || !sessionId) return;
  after(() => recordSiteVisit({ visitorId, sessionId }));
}

export async function recordSiteVisit(event: SiteVisitEvent) {
  if (!(await canReadFirestore())) return;
  const visitorId = parseVisitorId(event.visitorId);
  const sessionId = parseVisitorId(event.sessionId);
  if (!visitorId || !sessionId) return;

  const { db } = initAdmin();
  const sessionRef = db.collection(SITE_SEEN_COLLECTION).doc(siteSessionSeenId(sessionId));
  const uniqueRef = db.collection(SITE_SEEN_COLLECTION).doc(siteUniqueSeenId(visitorId));
  const statsRef = db.doc(STATS_DOC);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (sessionSnap.exists) return;
    const uniqueSnap = await tx.get(uniqueRef);
    tx.create(sessionRef, {
      kind: "session",
      visitorId,
      sessionId,
      createdAt: now,
    });
    const statsUpdate: Record<string, unknown> = {
      totalVisitors: FieldValue.increment(1),
      updatedAt: now,
    };
    if (!uniqueSnap.exists) {
      tx.create(uniqueRef, {
        kind: "unique",
        visitorId,
        createdAt: now,
      });
      statsUpdate.uniqueVisitors = FieldValue.increment(1);
    }
    tx.set(statsRef, statsUpdate, { merge: true });
  });
}

export async function getSiteVisitorStats(): Promise<SiteVisitorStats> {
  const empty = emptySiteVisitorStats();
  try {
    if (!(await canReadFirestore())) return empty;
    const { db } = initAdmin();
    const snap = await db.doc(STATS_DOC).get();
    return parseSiteVisitorStats(snap.data());
  } catch (error) {
    console.error("getSiteVisitorStats", error);
    return empty;
  }
}

function parseSiteVisitorStats(data: Record<string, unknown> | undefined): SiteVisitorStats {
  return {
    uniqueVisitors: finiteCount(data?.uniqueVisitors),
    totalVisitors: finiteCount(data?.totalVisitors),
  };
}

function finiteCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
