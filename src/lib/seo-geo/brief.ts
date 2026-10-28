import { askSeoModel, extractJsonObject, shortUrl } from "@/lib/seo-geo/agent";
import { fetchRankedKeywords, fetchSingaporeRankedKeywords, snapshotPrompt, type DomainSnapshot } from "@/lib/seo-geo/dataforseo";
import { discoverSitePages, diversePages, fetchSitePage } from "@/lib/seo-geo/fetch-site";
import { COURSE_QUESTIONS, COURSE_SECTIONS, marketsFromAnswers, parseReport, type SeoAnswer, type SeoQuestion, type SeoReport } from "@/lib/seo-geo/flow";
import { knowledgePrompt, loadKnowledgeChunks, rankChunks } from "@/lib/seo-geo/knowledge";
import { redactVendorNames } from "@/lib/seo-geo/redact";

const REPORT_SYSTEM = `You write the report by following the course notes only. Do not rename the lessons or invent a new framework. Return one JSON object only.
Section headings must be exactly: ${COURSE_SECTIONS.join(" | ")}.
Each section applies that lesson to this company, using the site evidence and the owner's worksheet answers. Do not invent rankings or volumes.
The business is registered in Singapore. Buyers are whoever the worksheet describes, including worldwide. Do not write a Singapore-only plan unless the answers say the buyers are in Singapore.
Each section is {"heading":"","points":["short line","short line"]}. Use 3 or 4 short points. No long paragraphs.
todos is a 3-month checklist. Include at least 4 items in Month 1, Month 2, and Month 3. Each item is {"month":"Month 1","title":"","detail":""}. Month 1 is the first checks and one page. Month 2 is publish, index, and read the result. Month 3 is the next page or a scale decision.
{"title":"","summary":"","charts":[],"tables":[{"title":"Starting keywords","headers":["Keyword","Market","Why kept or rejected"],"rows":[["term","Worldwide","reason"]]}],"sections":[{"heading":"Know your business, know your buyer","points":["One fact.","One decision."]}],"todos":[{"month":"Month 1","title":"","detail":""}]}
charts use the real snapshot numbers only. summary is 2 or 3 short sentences.`;

async function jsonFromModel(system: string, user: string, maxTokens: number) {
  let last = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    last = await askSeoModel(
      [
        { role: "system", content: system },
        { role: "user", content: attempt ? `Return JSON only.\n${user}` : user },
      ],
      maxTokens,
    );
    if (extractJsonObject(last)) return last;
  }
  return last;
}

export async function gatherQuestions(input: {
  brandName: string;
  domain: string;
  onProgress?: (note: string) => Promise<void>;
}) {
  await input.onProgress?.("Reading the sitemap…");
  const pages = await discoverSitePages(input.domain).catch(() => [] as string[]);
  const picks = diversePages([`https://${input.domain}/`, ...pages], 4);
  await input.onProgress?.(`Opening ${picks.length} different pages…`);
  const notes: string[] = [];
  for (const url of picks) {
    const page = await fetchSitePage(input.domain, url);
    if (!page.ok) continue;
    notes.push(
      `${shortUrl(page.url)}\nTitle: ${page.title}\nH1: ${page.h1 || "none"}\nDescription: ${page.description || "none"}\n${page.text.slice(0, 400)}`,
    );
  }
  await input.onProgress?.("Checking rankings in the registered home market…");
  const snapshot = await fetchSingaporeRankedKeywords(input.domain);
  await input.onProgress?.("Preparing the course worksheet…");
  return { snapshot, questions: COURSE_QUESTIONS, evidence: notes.join("\n\n") };
}

export async function buildReport(input: {
  brandName: string;
  domain: string;
  snapshot: DomainSnapshot | null;
  questions: SeoQuestion[];
  answers: SeoAnswer[];
  evidence?: string;
  onProgress?: (note: string) => Promise<void>;
}): Promise<{ report: SeoReport; snapshot: DomainSnapshot | null }> {
  await input.onProgress?.("Reading the full method…");
  const chunks = await loadKnowledgeChunks();
  const notes = knowledgePrompt(
    rankChunks(
      chunks,
      `${COURSE_SECTIONS.join(" ")} keyword technical content publish index landing page`,
      12,
    ),
  );
  const answers = input.questions
    .map((question) => {
      const answer = input.answers.find((item) => item.id === question.id);
      const value = Array.isArray(answer?.value) ? answer.value.join(", ") : answer?.value || "";
      return `${question.prompt}\n${value}`;
    })
    .join("\n\n");
  await input.onProgress?.("Writing the report…");
  const chosen = marketsFromAnswers(input.answers);
  const markets = chosen.length ? chosen : [{ label: "Singapore", code: 2702 }];
  const snapshots: DomainSnapshot[] = [];
  for (const market of markets) {
    await input.onProgress?.(`Checking rankings for ${market.label}…`);
    snapshots.push(await fetchRankedKeywords(input.domain, market));
  }
  const raw = await jsonFromModel(
    REPORT_SYSTEM,
    `Business: ${input.brandName}\nWebsite: ${input.domain}\nRegistered in Singapore. The buyer and market come from the worksheet, not from the register.\nPages:\n${input.evidence || "No page text saved."}\n\n${snapshots.map((item) => snapshotPrompt(item)).join("\n\n")}\n\nOwner worksheet:\n${answers}\n\nCourse notes:\n${notes}`,
    4500,
  );
  const report = parseReport(redactVendorNames(raw), snapshots);
  if (!report) throw new Error("The report could not be assembled.");
  return { report, snapshot: snapshots[0] || input.snapshot };
}
