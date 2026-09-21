"use client";

import { MAX_PHOTOS, movePhoto } from "@/lib/photos";
import { ui } from "@/lib/ui";

type PhotoLabels = {
  title: string;
  hint: string;
  remove: string;
  earlier: string;
  later: string;
};

export function PhotoOrderList({
  photos,
  onChange,
  labels,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  labels: Pick<PhotoLabels, "remove" | "earlier" | "later">;
}) {
  if (!photos.length) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {photos.map((src, index) => (
        <div key={src} className="relative h-32 w-28 overflow-hidden rounded-2xl border border-rule">
          <img src={src} alt="" className="h-full w-full object-contain bg-leaf" />
          <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-semibold text-white">
            {index + 1}
          </span>
          <button
            type="button"
            className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
            onClick={() => onChange(photos.filter((_, itemIndex) => itemIndex !== index))}
          >
            {labels.remove}
          </button>
          <div className="absolute inset-x-1 bottom-1 flex gap-1">
            <button
              type="button"
              className="flex-1 rounded-full bg-black/60 py-1 text-xs text-white disabled:opacity-30"
              disabled={index === 0}
              aria-label={labels.earlier}
              onClick={() => onChange(movePhoto(photos, index, -1))}
            >
              ←
            </button>
            <button
              type="button"
              className="flex-1 rounded-full bg-black/60 py-1 text-xs text-white disabled:opacity-30"
              disabled={index === photos.length - 1}
              aria-label={labels.later}
              onClick={() => onChange(movePhoto(photos, index, 1))}
            >
              →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PhotoUploader({
  uid,
  photos,
  onChange,
  labels,
  uploadUrl,
}: {
  uid: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  labels: PhotoLabels;
  uploadUrl?: string;
}) {
  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const next = [...photos];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue;
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "photo");
      if (uploadUrl) form.append("guestId", uid);
      const response = await fetch(uploadUrl || "/api/uploads", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not upload that photo.");
      next.push(data.url);
    }
    onChange(next.slice(0, MAX_PHOTOS));
  }

  return (
    <div>
      <p className={ui.label}>{labels.title}</p>
      <p className={`${ui.small} mb-2 max-w-[54ch]`}>{labels.hint}</p>
      <PhotoOrderList
        photos={photos}
        onChange={onChange}
        labels={{ remove: labels.remove, earlier: labels.earlier, later: labels.later }}
      />
      {photos.length < MAX_PHOTOS ? (
        <input
          className={ui.input}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}
