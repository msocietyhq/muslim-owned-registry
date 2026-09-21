"use client";

import type { FormEvent } from "react";
import { useCopy } from "@/components/i18n-provider";
import { ui } from "@/lib/ui";

function ExampleChips({
  examples,
  hero,
  onIntent,
  inert,
}: {
  examples: readonly string[];
  hero: boolean;
  onIntent: (value: string) => void;
  inert?: boolean;
}) {
  const chip = hero
    ? "mosg-example-chip mosg-example-chip-hero"
    : "mosg-example-chip mosg-example-chip-page";
  return (
    <div className="mosg-example-set" aria-hidden={inert || undefined}>
      {examples.map((example) => (
        <button
          key={example}
          className={chip}
          type="button"
          tabIndex={inert ? -1 : undefined}
          onClick={() => onIntent(example)}
        >
          {example}
        </button>
      ))}
    </div>
  );
}

export function SmartSearchForm({
  intent,
  onIntent,
  onSubmit,
  busy,
  variant = "page",
  examples,
  searchCountLabel,
}: {
  intent: string;
  onIntent: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  variant?: "page" | "hero";
  examples?: readonly string[];
  searchCountLabel?: string;
}) {
  const { t } = useCopy();
  const hero = variant === "hero";
  return (
    <form id="search" onSubmit={onSubmit} className={hero ? "grid w-full min-w-0 gap-3" : ui.form}>
      <div className="min-w-0">
        <label className={hero ? "sr-only" : ui.label} htmlFor="intent">
          {t.plan.label}
        </label>
        <textarea
          className={
            hero
              ? "h-[4.25rem] min-h-[4.25rem] w-full resize-none rounded-2xl border border-paper/15 bg-paper px-4 py-3 font-sans text-base leading-snug text-ink outline-none ring-gold/40 placeholder:text-muted focus:border-gold focus:ring-2 sm:h-[5.5rem] sm:min-h-[5.5rem] sm:text-lg"
              : `${ui.textarea} h-[4.25rem] min-h-[4.25rem] resize-none sm:h-[7.5rem] sm:min-h-[7.5rem]`
          }
          id="intent"
          rows={2}
          value={intent}
          onChange={(event) => onIntent(event.target.value)}
          placeholder={hero ? t.plan.label : t.plan.placeholder}
          required
          minLength={3}
          maxLength={400}
        />
      </div>
      {examples?.length ? (
        <div className="min-w-0">
          <p className={`mb-1.5 ${hero ? "text-xs text-paper/80" : ui.small}`}>{t.home.examplesLabel}</p>
          <div className="mosg-example-marquee">
            <div className="mosg-example-track">
              <ExampleChips examples={examples} hero={hero} onIntent={onIntent} />
              <ExampleChips examples={examples} hero={hero} onIntent={onIntent} inert />
            </div>
          </div>
        </div>
      ) : null}
      {searchCountLabel ? (
        <p className={hero ? "text-center text-sm text-paper/85" : `${ui.small} text-center`}>
          {searchCountLabel}
        </p>
      ) : null}
      <button
        className={
          hero
            ? "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold px-5 py-3 font-sans text-base font-semibold text-mihrab no-underline hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-11 sm:text-sm"
            : ui.button
        }
        type="submit"
        disabled={busy}
      >
        {busy ? t.plan.busy : t.plan.submit}
      </button>
    </form>
  );
}
