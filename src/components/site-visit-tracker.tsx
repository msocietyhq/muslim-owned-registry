"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { sendAnalyticsEvent } from "@/lib/analytics-client";
import {
  addVisibleTime,
  isPublicAnalyticsPath,
  shouldQualifyVisit,
  SITE_VISIT_DWELL_MS,
  VISIT_QUALIFIED_STORAGE,
  VISIT_SESSION_STORAGE,
  VISIT_VISIBLE_STORAGE,
} from "@/lib/site-analytics-core";
import { parseVisitorId } from "@/lib/visitor";
import { getVisitorId } from "@/lib/visitor-client";

function readNumber(key: string) {
  try {
    const value = Number(sessionStorage.getItem(key) || "0");
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function writeValue(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function getVisitSessionId() {
  try {
    const existing = parseVisitorId(sessionStorage.getItem(VISIT_SESSION_STORAGE));
    if (existing) return existing;
  } catch {
    /* private mode */
  }
  const id = crypto.randomUUID();
  writeValue(VISIT_SESSION_STORAGE, id);
  return id;
}

function isQualified() {
  try {
    return sessionStorage.getItem(VISIT_QUALIFIED_STORAGE) === "1";
  } catch {
    return false;
  }
}

export function SiteVisitTracker() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!isPublicAnalyticsPath(pathname)) return;
    if (isQualified()) return;

    const sessionId = getVisitSessionId();
    getVisitorId();
    let visibleMs = readNumber(VISIT_VISIBLE_STORAGE);
    let visible = document.visibilityState === "visible";
    let lastTick = Date.now();
    let stopped = false;
    let sent = isQualified();

    function persist(ms: number) {
      writeValue(VISIT_VISIBLE_STORAGE, String(Math.floor(ms)));
    }

    function qualify() {
      if (stopped || sent || isQualified()) return;
      sent = true;
      writeValue(VISIT_QUALIFIED_STORAGE, "1");
      sendAnalyticsEvent({ kind: "visit", sessionId });
    }

    function tick() {
      const now = Date.now();
      visibleMs = addVisibleTime(visibleMs, now - lastTick, visible);
      lastTick = now;
      persist(visibleMs);
      if (shouldQualifyVisit(visibleMs, sent || isQualified())) qualify();
    }

    const interval = window.setInterval(tick, 1000);
    function onVisibility() {
      tick();
      visible = document.visibilityState === "visible";
      lastTick = Date.now();
    }
    document.addEventListener("visibilitychange", onVisibility);

    if (shouldQualifyVisit(visibleMs, sent)) qualify();

    const timeout = window.setTimeout(() => {
      tick();
    }, Math.max(0, SITE_VISIT_DWELL_MS - visibleMs));

    return () => {
      tick();
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
