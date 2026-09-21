"use client";

import { useEffect, useId, useRef } from "react";
import { ui } from "@/lib/ui";

export type OutboundCopy = {
  title: string;
  lead: string;
  confirm: string;
  cancel: string;
};

export function OutboundConfirmModal({
  domain,
  copy,
  onConfirm,
  onCancel,
}: {
  domain: string;
  copy: OutboundCopy;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={copy.cancel}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.5rem] bg-paper p-5 shadow-2xl sm:rounded-[1.5rem] sm:p-6"
      >
        <h2 id={titleId} className="font-display text-xl font-medium text-mihrab">
          {copy.title}
        </h2>
        <p className="mt-3 leading-relaxed text-ink">{copy.lead}</p>
        <p className="mt-2 font-sans text-base font-semibold text-mihrab [overflow-wrap:anywhere]">{domain}</p>
        <div className={`${ui.ctaRow} mt-6`}>
          <button ref={confirmRef} className={ui.button} type="button" onClick={onConfirm}>
            {copy.confirm}
          </button>
          <button className={ui.buttonSecondary} type="button" onClick={onCancel}>
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
