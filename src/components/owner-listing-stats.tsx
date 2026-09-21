"use client";

import { useCopy } from "@/components/i18n-provider";
import { withCount } from "@/lib/stats-client";
import type { ListingStats } from "@/lib/types";
import { ui } from "@/lib/ui";

export function OwnerListingStats({
  stats,
  className = "mt-3",
}: {
  stats?: ListingStats | null;
  className?: string;
}) {
  const { t } = useCopy();
  const views = stats?.uniqueViews ?? 0;
  const impressions = stats?.uniqueImpressions ?? 0;
  return (
    <div className={`${ui.small} ${className}`}>
      <p>{withCount(t.app.uniqueViews, views)}</p>
      <p>{withCount(t.app.uniqueImpressions, impressions)}</p>
    </div>
  );
}
