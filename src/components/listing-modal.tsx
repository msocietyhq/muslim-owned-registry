"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ListingModal({
  title,
  closeLabel,
  children,
}: {
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function close() {
    router.back();
  }

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={closeLabel}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.5rem] bg-paper shadow-2xl sm:rounded-[1.5rem]"
      >
        <div className="flex items-center justify-end border-b border-rule/70 px-4 py-2">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-mihrab"
            onClick={close}
          >
            <span className="sr-only">{closeLabel}</span>
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
