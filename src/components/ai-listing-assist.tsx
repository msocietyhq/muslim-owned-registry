"use client";

import { useEffect, useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { api } from "@/lib/api-client";
import { LISTING_AI_NEED_SOURCE, type ListingAiDraft } from "@/lib/listing-ai";
import { ui } from "@/lib/ui";

type Labels = {
  open: string;
  close: string;
  title: string;
  lead: string;
  website: string;
  fill: string;
  busy: string;
  done: string;
};

type PhotoLabels = {
  title: string;
  hint: string;
  remove: string;
  earlier: string;
  later: string;
};

export function AiListingAssist({
  uid,
  photos,
  onPhotosChange,
  onDraft,
  labels,
  photoLabels,
  draftPath = "/api/listings/draft-from-source",
  uploadUrl,
}: {
  uid: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  onDraft: (draft: ListingAiDraft, tagIds: string[]) => void;
  labels: Labels;
  photoLabels: PhotoLabels;
  draftPath?: string;
  uploadUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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

  async function fill() {
    if (!website.trim() && !photos.length) {
      setError(LISTING_AI_NEED_SOURCE);
      return;
    }
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const data = await api<{ draft: ListingAiDraft; tagIds?: string[] }>(
        draftPath,
        {
          method: "POST",
          body: JSON.stringify({ website, photos }),
        },
      );
      onDraft(data.draft, Array.isArray(data.tagIds) ? data.tagIds.map(String) : []);
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.lead);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <button className={ui.buttonSecondary} type="button" onClick={() => setOpen(true)}>
        {labels.open}
      </button>
      {done && !open ? <p className={`${ui.notice} mt-3`}>{labels.done}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={labels.close}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-listing-assist-title"
            className="relative z-10 flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] bg-paper shadow-2xl sm:rounded-[1.5rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule/70 px-5 py-4">
              <h2 id="ai-listing-assist-title" className="font-display text-xl font-medium text-mihrab">
                {labels.title}
              </h2>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-mihrab"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">{labels.close}</span>
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="grid gap-3">
                <p className={ui.small}>{labels.lead}</p>
                {error ? <p className={ui.noticeError}>{error}</p> : null}
                <label>
                  <span className={ui.label}>{labels.website}</span>
                  <input
                    className={ui.input}
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    inputMode="url"
                    placeholder="https://"
                  />
                </label>
                <PhotoUploader
                  uid={uid}
                  photos={photos}
                  onChange={onPhotosChange}
                  labels={photoLabels}
                  uploadUrl={uploadUrl}
                />
                <button className={ui.button} type="button" disabled={busy} onClick={() => void fill()}>
                  {busy ? labels.busy : labels.fill}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
