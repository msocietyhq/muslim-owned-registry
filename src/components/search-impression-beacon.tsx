"use client";

import { useEffect } from "react";
import { sendAnalyticsEvent } from "@/lib/analytics-client";

export function SearchImpressionBeacon({ businessIds }: { businessIds: string[] }) {
  const key = businessIds.join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) return;
    sendAnalyticsEvent({
      kind: "impression",
      businessIds: ids,
    });
  }, [key]);
  return null;
}
