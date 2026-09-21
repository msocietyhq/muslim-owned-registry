"use client";

import { useEffect, useState } from "react";

export function PhotoStrip({
  photos,
  alt,
  className = "",
}: {
  photos: string[];
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") {
        setOpen((index) => (index === null ? index : (index + 1) % photos.length));
      }
      if (event.key === "ArrowLeft") {
        setOpen((index) =>
          index === null ? index : (index - 1 + photos.length) % photos.length,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photos.length) return null;

  return (
    <>
      <div className={`mosg-photo-strip no-scrollbar ${className}`.trim()}>
        {photos.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(index);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${alt} ${index + 1}`} />
          </button>
        ))}
      </div>
      {open !== null ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/15 text-white"
            onClick={() => setOpen(null)}
          >
            <span className="sr-only">Close photo</span>
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open]}
            alt={`${alt} ${open + 1}`}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
