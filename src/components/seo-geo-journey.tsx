"use client";

import { flowView, type SeoPhase } from "@/lib/seo-geo/flow";

export function SeoGeoJourney({ phase }: { phase: SeoPhase }) {
  const steps = flowView(phase);
  return (
    <div className="min-w-0 max-w-full">
      <p className="block font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-jade">
        Your report
      </p>
      <div className="no-scrollbar mt-2 min-w-0 max-w-full overflow-x-auto">
        <ol className="flex w-max flex-nowrap gap-2">
          {steps.map((step, index) => {
            const tone =
              step.status === "done"
                ? "border-jade bg-leaf text-mihrab"
                : step.status === "now"
                  ? "border-mihrab bg-mihrab text-paper"
                  : "border-rule bg-surface text-muted";
            return (
              <li key={step.id} className="shrink-0">
                <div className={`rounded-full border px-3 py-2 font-sans text-[11px] font-semibold whitespace-nowrap ${tone}`}>
                  Step {index + 1}: {step.label}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
