"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/components/i18n-provider";
import { readSession } from "@/lib/api-client";
import { ui } from "@/lib/ui";

export function UnclaimedBadge({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span
      className={
        small
          ? "inline-flex rounded-full border border-amber-300/80 bg-amber-100 px-1.5 py-px font-sans text-[9px] font-medium leading-tight tracking-[0.04em] text-amber-950"
          : "inline-flex rounded-full border border-amber-300/90 bg-amber-100 px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-950"
      }
    >
      {label}
    </span>
  );
}

export function UnclaimedListing({
  slug,
  show,
}: {
  slug: string;
  show: boolean;
}) {
  const { t } = useCopy();
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState<"choices" | "delete" | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!show) return null;

  async function claim() {
    const next = `/app/claim/${slug}`;
    const session = await readSession().catch(() => null);
    if (session?.user) {
      router.push(next);
      return;
    }
    router.push(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <UnclaimedBadge label={t.unclaimed.label} />
      <p className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 font-sans text-sm leading-relaxed text-stone-700">
        {t.unclaimed.note}
      </p>
      <button className={`${ui.buttonSecondary} self-start`} type="button" onClick={() => setOpen("choices")}>
        {t.unclaimed.button}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t.unclaimed.close}
            onClick={() => setOpen(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.5rem] bg-paper p-5 shadow-2xl sm:rounded-[1.5rem] sm:p-6"
          >
            {open === "choices" ? (
              <>
                <h2 id={titleId} className="font-display text-xl font-medium text-mihrab">
                  {t.unclaimed.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ink">{t.unclaimed.lead}</p>
                <div className={`${ui.ctaRow} mt-6`}>
                  <button className={ui.button} type="button" onClick={claim}>
                    {t.unclaimed.create}
                  </button>
                  <button className={ui.buttonSecondary} type="button" onClick={() => setOpen("delete")}>
                    {t.unclaimed.delete}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id={titleId} className="font-display text-xl font-medium text-mihrab">
                  {t.unclaimed.deleteTitle}
                </h2>
                <p className="mt-3 leading-relaxed text-ink">{t.unclaimed.deleteLead}</p>
                <div className={`${ui.ctaRow} mt-6`}>
                  <button className={ui.button} type="button" onClick={() => setOpen(null)}>
                    {t.unclaimed.close}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
