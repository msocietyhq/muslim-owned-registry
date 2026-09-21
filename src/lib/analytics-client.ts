import { getVisitorId } from "@/lib/visitor-client";

export function sendAnalyticsEvent(payload: Record<string, unknown>) {
  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      ...payload,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
