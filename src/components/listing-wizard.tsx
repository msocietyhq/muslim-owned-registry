"use client";

import { LISTING_WIZARD_STEPS, wizardStepLabel } from "@/lib/listing-wizard";
import { ui } from "@/lib/ui";

export { LISTING_WIZARD_STEPS, wizardStepLabel };

export function ListingWizardChrome({
  step,
  total,
  nudge,
  title,
  stepLabel,
}: {
  step: number;
  total: number;
  nudge: string;
  title: string;
  stepLabel: string;
}) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="mb-5">
      <p className="font-sans text-sm font-semibold text-mihrab">{nudge}</p>
      <p className={`${ui.small} mt-1`}>{stepLabel}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule/80" aria-hidden="true">
        <div
          className="h-full rounded-full bg-jade transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <h2 className="mt-4 font-display text-2xl text-mihrab">{title}</h2>
    </div>
  );
}

export function ListingWizardNav({
  step,
  isLast,
  busy,
  backLabel,
  nextLabel,
  submitLabel,
  onBack,
  submitDisabled,
}: {
  step: number;
  isLast: boolean;
  busy: boolean;
  backLabel: string;
  nextLabel: string;
  submitLabel: string;
  onBack: () => void;
  submitDisabled?: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-end">
      {isLast ? (
        <button className={ui.button} type="submit" disabled={busy || submitDisabled}>
          {submitLabel}
        </button>
      ) : (
        <button className={ui.button} type="submit">
          {nextLabel}
        </button>
      )}
      {step > 0 ? (
        <button className={ui.buttonSecondary} type="button" onClick={onBack} disabled={busy}>
          {backLabel}
        </button>
      ) : null}
    </div>
  );
}
