"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon } from "@/components/bookmark-icon";
import { isSavedSlug, toggleSavedSlug, WISHLIST_EVENT } from "@/lib/wishlist";

export function SavedHeart({
  slug,
  saveLabel,
  unsaveLabel,
  className = "",
}: {
  slug: string;
  saveLabel: string;
  unsaveLabel: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function sync() {
      setSaved(isSavedSlug(slug));
    }
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return (
    <button
      type="button"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rule/80 bg-surface/95 shadow-sm ${saved ? "border-gold/50 bg-gold/10 text-gold" : "text-mihrab"} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? unsaveLabel : saveLabel}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setSaved(toggleSavedSlug(slug));
      }}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
