"use client";

import { useEffect } from "react";
import { sendAnalyticsEvent } from "@/lib/analytics-client";

export function ListingViewBeacon({ businessId }: { businessId: string }) {
  useEffect(() => {
    if (!businessId) return;
    sendAnalyticsEvent({
      kind: "view",
      businessIds: [businessId],
    });
  }, [businessId]);
  return null;
}
