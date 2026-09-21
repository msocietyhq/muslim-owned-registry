"use client";

import Link from "next/link";
import { DemoBadge } from "@/components/demo-badge";
import { PhotoStrip } from "@/components/photo-strip";
import { SavedHeart } from "@/components/saved-heart";
import { useCopy } from "@/components/i18n-provider";
import { formatUpdatedAgo } from "@/lib/time";
import type { Business, Tag } from "@/lib/types";
import { isDemoListing } from "@/lib/types";

export function ListingCard({
  business,
  tags,
  demoLabel = "Demo",
  distanceLabel,
}: {
  business: Business;
  tags?: Map<string, Tag>;
  locale?: string;
  updatedLabel?: string;
  demoLabel?: string;
  distanceLabel?: string;
}) {
  const { t } = useCopy();
  const names = tags
    ? business.tagIds
        .map((id) => tags.get(id)?.name)
        .filter(Boolean)
        .join(" · ")
    : "";
  const updated = formatUpdatedAgo(business.lastConfirmedAt, t.card);
  const meta = [distanceLabel, updated].filter(Boolean).join(" · ");
  return (
    <article className="relative flex min-h-0 w-full min-w-0 max-w-full flex-nowrap items-start gap-3 overflow-hidden rounded-[1.25rem] border border-rule/70 bg-surface p-3 text-ink shadow-[0_12px_32px_-20px_rgba(14,75,58,0.45)] sm:gap-3.5 sm:p-3.5">
      <SavedHeart
        slug={business.slug}
        saveLabel={t.card.save}
        unsaveLabel={t.card.unsave}
        className="absolute right-2 top-2 z-10 min-h-9 min-w-9"
      />
      {business.photos?.length ? (
        <PhotoStrip
          photos={business.photos}
          alt={business.brandName}
          className="mosg-photo-strip--card shrink-0 self-start"
        />
      ) : null}
      <Link
        href={`/biz/${business.slug}`}
        scroll={false}
        className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5 pr-9 text-ink no-underline"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {isDemoListing(business) ? <DemoBadge label={demoLabel} /> : null}
          {names ? (
            <p className="min-w-0 truncate font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-jade">
              {names}
            </p>
          ) : null}
        </div>
        <h3 className="font-display text-[1.15rem] font-medium leading-snug text-mihrab [overflow-wrap:anywhere] sm:text-[1.25rem]">
          {business.brandName}
        </h3>
        <p className="truncate font-sans text-xs leading-snug text-muted">{business.registeredName}</p>
        {business.summary ? (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug [overflow-wrap:anywhere]">{business.summary}</p>
        ) : null}
        {meta ? <p className="mt-1 font-sans text-[11px] leading-snug text-muted">{meta}</p> : null}
      </Link>
    </article>
  );
}
