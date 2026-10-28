export const SEO_GEO_STEPS = [
  { id: "buyer", label: "Buyer" },
  { id: "keywords", label: "Keywords" },
  { id: "technical", label: "Site" },
  { id: "content", label: "Content" },
  { id: "publish", label: "Publish" },
  { id: "index", label: "Index" },
  { id: "measure", label: "Check" },
  { id: "scale", label: "Next" },
] as const;

export type JourneyStepId = (typeof SEO_GEO_STEPS)[number]["id"];
export type JourneyStepStatus = "todo" | "now" | "done";

export type JourneyState = {
  current: JourneyStepId;
  done: JourneyStepId[];
};

export function isJourneyStepId(value: string): value is JourneyStepId {
  return SEO_GEO_STEPS.some((step) => step.id === value);
}

export function emptyJourney(): JourneyState {
  return { current: "buyer", done: [] };
}

export function normalizeJourney(input: unknown): JourneyState {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const current = typeof row.current === "string" && isJourneyStepId(row.current) ? row.current : "buyer";
  const done = Array.isArray(row.done)
    ? row.done.filter((value): value is JourneyStepId => typeof value === "string" && isJourneyStepId(value))
    : [];
  return { current, done: [...new Set(done)] };
}

export function applyJourney(current: unknown, patch: { current?: string; done?: string[] }): JourneyState {
  const base = normalizeJourney(current);
  const nextDone = patch.done
    ? [...new Set(patch.done.filter((value): value is JourneyStepId => isJourneyStepId(value)))]
    : base.done;
  const nextCurrent =
    patch.current && isJourneyStepId(patch.current) ? patch.current : base.current;
  return {
    current: nextCurrent,
    done: nextDone.filter((id) => id !== nextCurrent),
  };
}

export function journeyView(state: JourneyState) {
  return SEO_GEO_STEPS.map((step) => {
    let status: JourneyStepStatus = "todo";
    if (state.done.includes(step.id)) status = "done";
    if (step.id === state.current) status = "now";
    return { ...step, status };
  });
}
