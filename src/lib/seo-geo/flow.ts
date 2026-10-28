import type { DomainSnapshot } from "@/lib/seo-geo/dataforseo";

export const SEO_FLOW = [
  { id: "check", label: "Check site" },
  { id: "answers", label: "Your answers" },
  { id: "analysis", label: "Analysis" },
  { id: "report", label: "Report" },
] as const;

export type FlowStepId = (typeof SEO_FLOW)[number]["id"];
export type SeoPhase = "intro" | "gathering" | "questions" | "reporting" | "report";
export type QuestionKind = "single" | "multi" | "text";

export type SeoQuestion = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options: string[];
};

export type SeoAnswer = { id: string; value: string | string[] };

export type SeoChart = { title: string; bars: { label: string; value: number }[] };
export type SeoTable = { title: string; headers: string[]; rows: string[][] };
export type SeoSection = { heading: string; points: string[] };
export type SeoTodo = { title: string; detail: string; month: "Month 1" | "Month 2" | "Month 3" };

export type SeoReport = {
  title: string;
  summary: string;
  charts: SeoChart[];
  tables: SeoTable[];
  sections: SeoSection[];
  todos: SeoTodo[];
};

export const COURSE_SECTIONS = [
  "Know your business, know your buyer",
  "Research keyword opportunities",
  "Choose your starting keywords",
  "Technical SEO: site and page essentials",
  "Technical SEO: supporting checks",
  "Map one starting keyword to a page",
  "Review and publish",
  "Indexing",
  "Check, debug and repeat",
  "Create a useful landing page",
  "Scale landing pages",
] as const;

/** Owner worksheet from the course lesson "Know your business, know your buyer". */
export const COURSE_QUESTIONS: SeoQuestion[] = [
  { id: "sell", kind: "text", prompt: "What do you sell, in one plain sentence?", options: [] },
  { id: "buyer", kind: "text", prompt: "Who is the primary buyer, and what situation are they in?", options: [] },
  { id: "fix", kind: "text", prompt: "What are they trying to fix, avoid, or achieve?", options: [] },
  { id: "now", kind: "text", prompt: "Why does the problem matter now?", options: [] },
  { id: "choose", kind: "text", prompt: "Why might they choose you instead of an alternative?", options: [] },
  { id: "feature", kind: "text", prompt: "Which live feature matters most to this buyer?", options: [] },
  { id: "words", kind: "text", prompt: "Which words do they use for the product, problem, and desired outcome?", options: [] },
  {
    id: "countries",
    kind: "multi",
    prompt: "Which countries are you targeting?",
    options: ["Worldwide", "Singapore", "Malaysia", "USA", "Europe", "Australia"],
  },
  {
    id: "other-country",
    kind: "text",
    prompt: "Name any other country you are targeting. Write none if the list above is enough.",
    options: [],
  },
];

export function phaseStep(phase: SeoPhase): FlowStepId {
  if (phase === "questions") return "answers";
  if (phase === "reporting") return "analysis";
  if (phase === "report") return "report";
  return "check";
}

export function flowView(phase: SeoPhase) {
  const current = phaseStep(phase);
  const order = SEO_FLOW.map((step) => step.id);
  const at = order.indexOf(current);
  return SEO_FLOW.map((step, index) => ({
    ...step,
    status: index < at ? "done" : index === at ? "now" : "todo",
  })) as { id: FlowStepId; label: string; status: "done" | "now" | "todo" }[];
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fence?.[1] || text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(raw.slice(start, end + 1)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toPoints(value: unknown, body: string) {
  const listed = Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean).slice(0, 5) : [];
  if (listed.length) return listed;
  return body
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 12)
    .slice(0, 4);
}

const MONTHS = ["Month 1", "Month 2", "Month 3"] as const;

function asMonth(value: unknown, index: number): (typeof MONTHS)[number] {
  const text = clean(value);
  if (/month\s*1/i.test(text)) return "Month 1";
  if (/month\s*2/i.test(text)) return "Month 2";
  if (/month\s*3/i.test(text)) return "Month 3";
  return MONTHS[index % 3];
}

export function parseQuestions(text: string): SeoQuestion[] {
  const json = extractJsonObject(text);
  const rows = Array.isArray(json?.questions) ? json.questions : [];
  const questions: SeoQuestion[] = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const item = row as Record<string, unknown>;
    const kind: QuestionKind = item.kind === "multi" || item.kind === "text" ? item.kind : "single";
    const options = Array.isArray(item.options)
      ? item.options.map((option) => clean(option)).filter(Boolean).slice(0, 6)
      : [];
    const prompt = clean(item.prompt);
    if (!prompt) return;
    if (kind !== "text" && options.length < 2) return;
    questions.push({
      id: clean(item.id) || `q${index + 1}`,
      kind,
      prompt: prompt.slice(0, 240),
      options,
    });
  });
  return questions.slice(0, 8);
}

export function ensureQuestionMix(questions: SeoQuestion[]) {
  const next = questions.slice(0, 8);
  const put = (question: SeoQuestion) => {
    if (next.length < 8) next.push(question);
    else next[next.length - 1] = question;
  };
  if (!next.some((question) => question.kind === "text")) {
    put({
      id: "own-words",
      kind: "text",
      prompt: "In one sentence, what should a new visitor understand that you sell?",
      options: [],
    });
  }
  if (!next.some((question) => question.kind === "multi")) {
    put({
      id: "markets",
      kind: "multi",
      prompt: "Which markets matter first?",
      options: ["Worldwide", "Singapore", "Malaysia", "USA", "Europe", "Australia"],
    });
  }
  return next;
}

export function marketsFromAnswers(answers: SeoAnswer[]) {
  const text = answers
    .map((answer) => (Array.isArray(answer.value) ? answer.value.join(" ") : answer.value))
    .join(" ");
  const catalog = [
    { match: /world|global|international|anywhere/i, label: "Worldwide (English search in the United States)", code: 2840 },
    { match: /singapore/i, label: "Singapore", code: 2702 },
    { match: /malaysia/i, label: "Malaysia", code: 2458 },
    { match: /\busa\b|united states/i, label: "United States", code: 2840 },
    { match: /\buk\b|united kingdom|britain|europe/i, label: "United Kingdom", code: 2826 },
    { match: /australia/i, label: "Australia", code: 2036 },
  ];
  const found: { label: string; code: number }[] = [];
  const seen = new Set<number>();
  for (const market of catalog) {
    if (!market.match.test(text) || seen.has(market.code)) continue;
    seen.add(market.code);
    found.push({ label: market.label, code: market.code });
  }
  return found;
}

export function answersComplete(questions: SeoQuestion[], answers: SeoAnswer[]) {
  return questions.every((question) => {
    const answer = answers.find((item) => item.id === question.id);
    if (!answer) return false;
    if (Array.isArray(answer.value)) return answer.value.length > 0;
    return answer.value.trim().length > 0;
  });
}

export function chartFromKeywords(snapshot: DomainSnapshot | null): SeoChart | null {
  const bars = (snapshot?.keywords || [])
    .filter((row) => typeof row.volume === "number" && row.volume > 0)
    .slice(0, 8)
    .map((row) => ({ label: row.keyword, value: row.volume as number }));
  if (!snapshot || !bars.length) return null;
  return { title: `${snapshot.location} search volume`, bars };
}

export function parseReport(text: string, snapshot: DomainSnapshot | DomainSnapshot[] | null): SeoReport | null {
  const json = extractJsonObject(text);
  if (!json) return null;
  const charts = Array.isArray(json.charts)
    ? json.charts
        .map((chart) => {
          const item = chart as Record<string, unknown>;
          const bars = Array.isArray(item.bars)
            ? item.bars
                .map((bar) => {
                  const row = bar as Record<string, unknown>;
                  const value = Number(row.value);
                  return { label: clean(row.label).slice(0, 80), value };
                })
                .filter((bar) => bar.label && Number.isFinite(bar.value) && bar.value >= 0)
                .slice(0, 8)
            : [];
          return { title: clean(item.title).slice(0, 80) || "Chart", bars };
        })
        .filter((chart) => chart.bars.length && !/volume|position/i.test(String((chart as { title?: string }).title || "")))
    : [];
  const snapshots = Array.isArray(snapshot) ? snapshot : snapshot ? [snapshot] : [];
  for (const item of snapshots) {
    const volume = chartFromKeywords(item);
    if (volume && !charts.some((chart) => chart.title === volume.title)) charts.push(volume);
    const positions = (item.keywords || [])
      .filter((row) => typeof row.position === "number" && row.position > 0)
      .slice(0, 8)
      .map((row) => ({ label: row.keyword, value: row.position as number }));
    const positionTitle = `${item.location} Google position`;
    if (positions.length && !charts.some((chart) => chart.title === positionTitle)) {
      charts.push({ title: positionTitle, bars: positions });
    }
  }
  const tables = Array.isArray(json.tables)
    ? json.tables
        .map((table) => {
          const item = table as Record<string, unknown>;
          const headers = Array.isArray(item.headers) ? item.headers.map((cell) => clean(cell)).slice(0, 6) : [];
          const rows = Array.isArray(item.rows)
            ? item.rows
                .map((row) => (Array.isArray(row) ? row.map((cell) => clean(cell)).slice(0, headers.length || 6) : []))
                .filter((row) => row.length)
                .slice(0, 12)
            : [];
          return { title: clean(item.title).slice(0, 80) || "Table", headers, rows };
        })
        .filter((table) => table.headers.length && table.rows.length)
    : [];
  const written = new Map<string, string[]>();
  if (Array.isArray(json.sections)) {
    for (const section of json.sections) {
      const item = section as Record<string, unknown>;
      const heading = clean(item.heading);
      const points = toPoints(item.points, clean(item.body));
      if (heading && points.length) written.set(heading.toLowerCase(), points);
    }
  }
  const sections = COURSE_SECTIONS.map((heading) => ({
    heading,
    points: written.get(heading.toLowerCase()) || ["Not enough evidence yet for this part."],
  }));
  const todos = Array.isArray(json.todos)
    ? json.todos
        .map((todo, index) => {
          const item = todo as Record<string, unknown>;
          return {
            title: clean(item.title).slice(0, 120),
            detail: clean(item.detail).slice(0, 240),
            month: asMonth(item.month, index),
          };
        })
        .filter((todo) => todo.title)
        .slice(0, 18)
    : [];
  const title = clean(json.title).slice(0, 120) || "Website search report";
  const summary = clean(json.summary).slice(0, 800);
  if (!summary) return null;
  return { title, summary, charts, tables, sections, todos };
}
