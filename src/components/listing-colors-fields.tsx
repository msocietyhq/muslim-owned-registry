"use client";

import {
  DEFAULT_LISTING_PRIMARY,
  DEFAULT_LISTING_SECONDARY,
} from "@/lib/listing-colors";
import { ui } from "@/lib/ui";

type Labels = {
  legend: string;
  hint: string;
  primary: string;
  primaryHint: string;
  secondary: string;
  secondaryHint: string;
  clear: string;
  unset: string;
};

export function ListingColorsFields({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
  labels,
}: {
  primary: string;
  secondary: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  labels: Labels;
}) {
  function clearPrimary() {
    onPrimaryChange("");
    onSecondaryChange("");
  }

  return (
    <fieldset>
      <legend className={ui.label}>{labels.legend}</legend>
      <p className={`${ui.small} mb-3`}>{labels.hint}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className={ui.label}>{labels.primary}</span>
          <p className={ui.small}>{labels.primaryHint}</p>
          <span className="flex flex-wrap items-center gap-3">
            <input
              className="h-12 w-16 cursor-pointer rounded-xl border border-rule bg-surface p-1"
              type="color"
              value={primary || DEFAULT_LISTING_PRIMARY}
              onChange={(event) => onPrimaryChange(event.target.value)}
              aria-label={labels.primary}
            />
            <span className="font-sans text-sm text-ink">
              {primary ? primary.toUpperCase() : labels.unset}
            </span>
            {primary ? (
              <button className={ui.link} type="button" onClick={clearPrimary}>
                {labels.clear}
              </button>
            ) : null}
          </span>
        </label>
        <label className="grid gap-2">
          <span className={ui.label}>{labels.secondary}</span>
          <p className={ui.small}>{labels.secondaryHint}</p>
          <span className="flex flex-wrap items-center gap-3">
            <input
              className="h-12 w-16 cursor-pointer rounded-xl border border-rule bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-40"
              type="color"
              value={secondary || DEFAULT_LISTING_SECONDARY}
              disabled={!primary}
              onChange={(event) => onSecondaryChange(event.target.value)}
              aria-label={labels.secondary}
            />
            <span className="font-sans text-sm text-ink">
              {secondary ? secondary.toUpperCase() : labels.unset}
            </span>
            {secondary ? (
              <button className={ui.link} type="button" onClick={() => onSecondaryChange("")}>
                {labels.clear}
              </button>
            ) : null}
          </span>
        </label>
      </div>
    </fieldset>
  );
}
