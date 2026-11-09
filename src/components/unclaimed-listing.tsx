"use client";

import { useEffect, useId, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api, readSession } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
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

export function RemoveUnclaimedButton({
  businessId,
  redirectTo = "/browse",
}: {
  businessId: string;
  redirectTo?: string;
}) {
  const { t } = useCopy();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, open]);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api("/api/listings/unclaimed/remove", {
        method: "POST",
        body: JSON.stringify({ id: businessId }),
      });
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unclaimed.removeFail);
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`${ui.buttonSecondary} self-start`} type="button" onClick={() => setOpen(true)}>
        {t.unclaimed.remove}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t.unclaimed.close}
            onClick={() => {
              if (!busy) setOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.5rem] bg-paper p-5 shadow-2xl sm:rounded-[1.5rem] sm:p-6"
          >
            <h2 id={titleId} className="font-display text-xl font-medium text-mihrab">
              {t.unclaimed.removeTitle}
            </h2>
            <p className="mt-3 leading-relaxed text-ink">{t.unclaimed.removeLead}</p>
            {error ? <p className={`${ui.noticeError} mt-4`}>{error}</p> : null}
            <div className={`${ui.ctaRow} mt-6`}>
              <button className={ui.button} type="button" disabled={busy} onClick={remove}>
                {busy ? t.unclaimed.removeBusy : t.unclaimed.removeConfirm}
              </button>
              <button
                className={ui.buttonSecondary}
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                {t.unclaimed.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function UnclaimedListing({
  slug,
  businessId,
  show,
}: {
  slug: string;
  businessId: string;
  show: boolean;
}) {
  const { t } = useCopy();
  const titleId = useId();
  const { isAdmin, ready } = useAuthUser({ loginRedirect: false });
  const [open, setOpen] = useState<"choices" | "delete" | null>(null);
  const canRemove = ready && isAdmin;

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
    setOpen(null);
    const next = `/app/claim/${slug}`;
    const session = await readSession().catch(() => null);
    const href = session?.user ? next : `/login?next=${encodeURIComponent(next)}`;
    // Full load drops the intercepted listing modal, which stays open across router.push.
    window.location.assign(href);
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
      {canRemove ? <RemoveUnclaimedButton businessId={businessId} /> : null}
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
