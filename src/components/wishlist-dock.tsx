"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookmarkIcon } from "@/components/bookmark-icon";
import { ListingCard } from "@/components/listing-card";
import { useCopy } from "@/components/i18n-provider";
import type { Business, Tag } from "@/lib/types";
import { listSavedSlugs, WISHLIST_EVENT } from "@/lib/wishlist";
import { ui } from "@/lib/ui";

export function WishlistDock() {
  const { t } = useCopy();
  const pathname = usePathname();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tags, setTags] = useState<Map<string, Tag>>(new Map());

  useEffect(() => {
    function sync() {
      setSlugs(listSavedSlugs());
    }
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!slugs.length) setOpen(false);
  }, [slugs.length]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        const map = new Map<string, Tag>((data.tags || []).map((tag: Tag) => [tag.id, tag]));
        setTags(map);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open || !slugs.length) {
      if (!slugs.length) setBusinesses([]);
      return;
    }
    fetch(`/api/listings?slugs=${encodeURIComponent(slugs.join(","))}`)
      .then((res) => res.json())
      .then((data) => setBusinesses(data.businesses || []))
      .catch(() => setBusinesses([]));
  }, [open, slugs]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!slugs.length) return null;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t.biz.close}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.saved.title}
            className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.5rem] bg-paper shadow-2xl sm:rounded-[1.5rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule/70 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl text-mihrab">{t.saved.title}</h2>
                <p className="mt-1 max-w-[54ch] font-sans text-xs leading-snug text-muted">{t.saved.lead}</p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-mihrab"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">{t.biz.close}</span>
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {businesses.length ? (
                <div className={ui.columns}>
                  {businesses.map((business) => (
                    <ListingCard
                      key={business.id}
                      business={business}
                      tags={tags}
                      demoLabel={t.card.demo}
                    />
                  ))}
                </div>
              ) : (
                <p className="max-w-[54ch] leading-relaxed">{t.saved.empty}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full border-2 border-paper bg-mihrab px-5 font-sans text-sm font-semibold text-paper shadow-[0_16px_40px_-16px_rgba(12,63,50,0.8)] hover:bg-jade"
          onClick={() => setOpen(true)}
        >
          <BookmarkIcon filled className="h-4 w-4" />
          {t.saved.view}
        </button>
      )}
    </>
  );
}
