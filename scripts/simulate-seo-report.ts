/**
 * One full SEO report pass: site check, questions, answers, report, Word, PDF.
 * Run with production env: railway run --service web npx tsx scripts/simulate-seo-report.ts
 */
import { writeFileSync } from "node:fs";
import { gatherQuestions, buildReport } from "../src/lib/seo-geo/brief";
import type { SeoAnswer } from "../src/lib/seo-geo/flow";
import { reportDocx, reportPdf } from "../src/lib/seo-geo/office";

function answerFor(question: { id: string; kind: string; prompt: string; options: string[] }): SeoAnswer {
  if (question.kind === "multi") {
    return { id: question.id, value: question.options.slice(0, 2) };
  }
  if (question.kind === "single") {
    return { id: question.id, value: question.options[0] || "" };
  }
  const prompt = question.prompt.toLowerCase();
  const value = prompt.includes("buyer") || prompt.includes("who")
    ? "HR and office managers booking a team activity."
    : prompt.includes("sell") || prompt.includes("offer")
      ? "App-based scavenger hunts for company events."
      : "Book a demo.";
  return { id: question.id, value };
}

async function main() {
  const domain = process.argv[2] || "playtours.app";
  const brand = "PlayTours";
  const steps: string[] = [];
  const gathered = await gatherQuestions({
    brandName: brand,
    domain,
    onProgress: async (note) => {
      steps.push(note);
      console.log("progress", note);
    },
  });
  const answers = gathered.questions.map(answerFor);
  const built = await buildReport({
    brandName: brand,
    domain,
    snapshot: gathered.snapshot,
    questions: gathered.questions,
    answers,
    onProgress: async (note) => {
      steps.push(note);
      console.log("progress", note);
    },
  });
  const docx = reportDocx(built.report);
  const pdf = reportPdf(built.report);
  writeFileSync("/tmp/seo-sim-report.docx", docx);
  writeFileSync("/tmp/seo-sim-report.pdf", pdf);
  const thin = built.report.sections.filter((section) => section.body.length < 80 || /not enough evidence/i.test(section.body));
  const summary = {
    domain,
    keywords: gathered.snapshot.keywords.length,
    keywordError: gathered.snapshot.error,
    questionKinds: gathered.questions.map((question) => question.kind),
    questions: gathered.questions.map((question) => ({
      kind: question.kind,
      prompt: question.prompt,
      options: question.options,
    })),
    answers,
    reportTitle: built.report.title,
    summary: built.report.summary,
    charts: built.report.charts.map((chart) => ({ title: chart.title, bars: chart.bars.length })),
    tables: built.report.tables.map((table) => ({ title: table.title, rows: table.rows.length })),
    sections: built.report.sections.map((section) => ({
      heading: section.heading,
      chars: section.body.length,
      body: section.body,
    })),
    thinSections: thin.map((section) => section.heading),
    todos: built.report.todos,
    docxBytes: docx.length,
    pdfBytes: pdf.length,
    docxOk: docx.subarray(0, 2).toString() === "PK",
    pdfOk: pdf.subarray(0, 5).toString() === "%PDF-",
    steps,
  };
  writeFileSync("/tmp/seo-sim-summary.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    questions: summary.questionKinds,
    keywords: summary.keywords,
    keywordError: summary.keywordError,
    thinSections: summary.thinSections,
    charts: summary.charts,
    tables: summary.tables,
    todos: summary.todos.length,
    docxOk: summary.docxOk,
    pdfOk: summary.pdfOk,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
