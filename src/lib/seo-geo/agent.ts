import { SEO_GEO_MODEL, seoGeoAgentRounds } from "@/lib/seo-geo/config";
import { fetchSingaporeRankedKeywords, snapshotPrompt, type DomainSnapshot } from "@/lib/seo-geo/dataforseo";
import { discoverSitePages, diversePages, fetchSitePage, pageKey, suggestRealPages } from "@/lib/seo-geo/fetch-site";
import { applyJourney, isJourneyStepId, type JourneyState } from "@/lib/seo-geo/journey";
import { knowledgePrompt, loadKnowledgeChunks, rankChunks } from "@/lib/seo-geo/knowledge";
import { redactVendorNames } from "@/lib/seo-geo/redact";
import { runtimeEnv } from "@/lib/runtime-env";

export const SEO_GEO_AGENT_SYSTEM = `You are the SEO and GEO assistant on muslimowned.sg. You work in the background for the signed-in owner of one live listing. You research their company website yourself.

Rules:
- Stay on this website domain. Refuse other sites, social profiles, and unrelated tasks.
- Only open pages from the sitemap or from links on a page you already read. Never invent a URL from a keyword.
- Skip a page you already opened and pick a different real page. A missing page is skipped, then you continue with another real page.
- Cover the site as a whole: homepage, offer pages, one guide, and one article if they exist. Then write the answer.
- Do not tell the owner you will fetch or inspect later. Call the tool in this turn.
- Do not give the owner a checklist to inspect the page, Google, or Search Console. Report what you already fetched.
- Ask the owner only for facts only they know: what they sell, who buys, a page they already published, or a login they must click.
- Follow the journey: buyer → keywords → site → content → publish → index → check → next.
- Use evidence. Do not invent rankings, volumes, citations, or enquiry counts.
- Never name a course vendor, tutor, or third-party assistant product.
- Final markdown is short and practical, based on tool results.

On every turn return a single JSON object, no other text:
{"tool":"fetch_page","url":"https://example.com/path"}
{"tool":"ranked_keywords"}
{"tool":"course_notes","query":"short search"}
{"tool":"set_journey","current":"keywords","done":["buyer"]}
{"tool":"done","markdown":"## Heading\\nYour answer"}
Valid current values: buyer, keywords, technical, content, publish, index, measure, scale.`;

export type AgentMessage = { role: "user" | "assistant" | "system"; content: string };

export type AgentToolName = "fetch_page" | "ranked_keywords" | "course_notes" | "set_journey" | "done";

export type ParsedAgentAction =
  | { ok: true; tool: "fetch_page"; url: string }
  | { ok: true; tool: "ranked_keywords" }
  | { ok: true; tool: "course_notes"; query: string }
  | { ok: true; tool: "set_journey"; current?: string; done?: string[] }
  | { ok: true; tool: "done"; markdown: string }
  | { ok: false; error: string };

export function extractJsonObject(text: string): Record<string, unknown> | null {
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

export function looksLikeIncompleteWork(markdown: string) {
  const text = markdown.toLowerCase();
  return (
    /\bi('ll| will) (start|fetch|check|look|inspect)\b/.test(text) ||
    /\blet me (fetch|check|look|inspect)\b/.test(text) ||
    /\bopen your\b/.test(text) ||
    /\binspect the (existing|current|page)\b/.test(text) ||
    /\bdoes the (title|h1|first paragraph)\b/.test(text)
  );
}

export function parseAgentAction(text: string): ParsedAgentAction {
  const json = extractJsonObject(text);
  if (!json) {
    return { ok: false, error: "Reply must be a JSON tool object." };
  }
  const tool = String(json.tool || json.name || "");
  if (tool === "fetch_page") {
    const url = String(json.url || "");
    if (!url) return { ok: false, error: "fetch_page needs a url." };
    return { ok: true, tool: "fetch_page", url };
  }
  if (tool === "ranked_keywords") return { ok: true, tool: "ranked_keywords" };
  if (tool === "course_notes") {
    return { ok: true, tool: "course_notes", query: String(json.query || "") };
  }
  if (tool === "set_journey") {
    const done = Array.isArray(json.done) ? json.done.map((value) => String(value)) : undefined;
    const current = json.current ? String(json.current) : undefined;
    if (current && !isJourneyStepId(current)) return { ok: false, error: "Unknown journey step." };
    return { ok: true, tool: "set_journey", current, done };
  }
  if (tool === "done") {
    const markdown = redactVendorNames(String(json.markdown || json.content || "")).trim();
    if (!markdown) return { ok: false, error: "done needs markdown." };
    if (looksLikeIncompleteWork(markdown)) {
      return {
        ok: false,
        error: "done markdown still asks the owner to inspect. Fetch first, then report findings.",
      };
    }
    return { ok: true, tool: "done", markdown };
  }
  const markdown = redactVendorNames(String(json.markdown || "")).trim();
  if (markdown) return { ok: true, tool: "done", markdown };
  return { ok: false, error: `Unknown tool ${tool || "object"}.` };
}

export function hasRepeatedPath(rawUrl: string) {
  let path = rawUrl;
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    path = new URL(withScheme).pathname;
  } catch {
    path = rawUrl;
  }
  const counts = new Map<string, number>();
  for (const part of path.toLowerCase().split(/[^a-z0-9]+/)) {
    if (part.length < 4) continue;
    const count = (counts.get(part) || 0) + 1;
    if (count >= 3) return true;
    counts.set(part, count);
  }
  return false;
}

export function shortUrl(rawUrl: string) {
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const url = new URL(withScheme);
    const path = url.pathname === "/" ? url.host : url.pathname;
    return path.length > 42 ? `${path.slice(0, 39)}…` : path;
  } catch {
    return rawUrl.length > 42 ? `${rawUrl.slice(0, 39)}…` : rawUrl;
  }
}

export function stepNote(step: number, action: ParsedAgentAction) {
  if (!action.ok) return `Step ${step} · Retrying a bad reply…`;
  if (action.tool === "fetch_page") return `Step ${step} · Will read ${shortUrl(action.url)}`;
  if (action.tool === "ranked_keywords") return `Step ${step} · Will check search terms`;
  if (action.tool === "course_notes") return `Step ${step} · Will read the method notes`;
  if (action.tool === "set_journey") return `Step ${step} · Will update the map`;
  return `Step ${step} · Answer is ready`;
}

export function toolNote(action: ParsedAgentAction) {
  if (!action.ok) return "Working…";
  if (action.tool === "fetch_page") return "Reading the website…";
  if (action.tool === "ranked_keywords") return "Checking search terms…";
  if (action.tool === "course_notes") return "Reading the method notes…";
  if (action.tool === "set_journey") return "Updating the map…";
  return "Writing the answer…";
}

export async function askSeoModel(messages: AgentMessage[], maxTokens = 1800) {
  const key = runtimeEnv("DEEPSEEK_API_KEY");
  if (!key) throw new Error("The assistant is not configured yet.");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SEO_GEO_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      messages,
    }),
  });
  const json = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `Model request failed (${response.status}).`);
  }
  const content = json.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error("The model returned an empty reply.");
  return content;
}

export async function runSeoGeoAgent(input: {
  brandName: string;
  domain: string;
  snapshot: DomainSnapshot | null;
  journey: JourneyState;
  history: { role: "user" | "assistant"; content: string }[];
  maxRounds?: number;
  onProgress?: (note: string, journey: JourneyState) => Promise<void>;
}) {
  let journey = input.journey;
  let snapshot = input.snapshot;
  let researched = false;
  const found: string[] = [];
  const opened = new Set<string>();
  const known = new Map<string, string>();
  await input.onProgress?.("Reading the sitemap…", input.journey);
  try {
    for (const url of await discoverSitePages(input.domain)) {
      const key = pageKey(url);
      if (key) known.set(key, url);
    }
  } catch {
    // The homepage can still be opened when the sitemap is missing.
  }
  const home = `https://${input.domain}/`;
  const homeKey = pageKey(home);
  if (homeKey) known.set(homeKey, home);
  await input.onProgress?.(`Found ${known.size} real pages`, input.journey);
  const catalog = diversePages([...known.values()], 18)
    .map((url) => shortUrl(url))
    .join("\n");
  const transcript: AgentMessage[] = [
    { role: "system", content: SEO_GEO_AGENT_SYSTEM },
    {
      role: "system",
      content: `Business: ${input.brandName}\nWebsite: ${input.domain}\nJourney: current ${input.journey.current}, done ${input.journey.done.join(", ") || "none"}\n${snapshotPrompt(input.snapshot)}\n\nReal pages already found. Open different ones from this list:\n${catalog || home}`,
    },
    ...input.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const maxRounds = input.maxRounds ?? seoGeoAgentRounds(null);
  const remember = (url: string) => {
    const key = pageKey(url);
    if (key) known.set(key, url);
  };
  for (let round = 0; round < maxRounds; round += 1) {
    const step = round + 1;
    await input.onProgress?.(`Step ${step} · Thinking…`, journey);
    const raw = await askSeoModel(transcript);
    const action = parseAgentAction(raw);
    await input.onProgress?.(stepNote(step, action), journey);
    if (!action.ok) {
      transcript.push({ role: "assistant", content: raw });
      transcript.push({ role: "user", content: `Tool error: ${action.error}. Return JSON only.` });
      continue;
    }
    if (action.tool === "done") {
      if (!researched) {
        transcript.push({ role: "assistant", content: raw });
        transcript.push({
          role: "user",
          content:
            "Tool error: You have not fetched the site or keywords yet. Call fetch_page or ranked_keywords first.",
        });
        continue;
      }
      await input.onProgress?.(`Step ${step} · Writing the answer…`, journey);
      return { markdown: action.markdown, journey, snapshot };
    }
    transcript.push({ role: "assistant", content: raw });
    let observation = "";
    if (action.tool === "fetch_page") {
      researched = true;
      const label = shortUrl(action.url);
      const key = pageKey(action.url);
      const unused = [...known.values()].filter((url) => {
        const item = pageKey(url);
        return item && !opened.has(item);
      });
      if (!key || hasRepeatedPath(action.url) || !known.has(key)) {
        const ideas = suggestRealPages(action.url, unused, 5).map((url) => shortUrl(url));
        observation = `That address is not a real page on this website. It was not in the sitemap or in a link already read. Do not invent URLs from keywords. Open a different page from this list:\n${ideas.join("\n") || catalog}`;
        await input.onProgress?.(`Step ${step} · Skipped an unknown page`, journey);
      } else if (opened.has(key)) {
        const ideas = suggestRealPages(action.url, unused, 5).map((url) => shortUrl(url));
        observation = `Already opened. Pick a different page:\n${ideas.join("\n")}`;
        await input.onProgress?.(`Step ${step} · Already opened ${label}`, journey);
      } else if (opened.size >= 8) {
        observation = "Eight different pages are enough. Call done and summarise the whole site, not one URL.";
        await input.onProgress?.(`Step ${step} · Enough different pages`, journey);
      } else {
        opened.add(key);
        const page = await fetchSitePage(input.domain, action.url);
        await input.onProgress?.(
          page.ok && page.cached
            ? `Step ${step} · Saved copy of ${label}`
            : `Step ${step} · Opened ${label}`,
          journey,
        );
        const missing = !page.ok || page.status >= 400 || /not found/i.test(page.title || "");
        if (page.ok) {
          for (const link of page.links) remember(link);
        }
        observation = JSON.stringify(
          page.ok ? { ...page, links: page.links.slice(0, 12).map((link) => shortUrl(link)) } : page,
        ).slice(0, 4000);
        if (missing) {
          found.push(`- Missing: ${label}`);
          await input.onProgress?.(`Step ${step} · Missing ${label}. Continuing.`, journey);
          observation += "\nThis page is missing. Continue with a different real page. Do not invent a replacement URL.";
        } else {
          found.push(`- ${page.title || label}: ${page.text.slice(0, 280)}`);
          await input.onProgress?.(`Step ${step} · Read “${page.title || label}”`, journey);
        }
      }
    } else if (action.tool === "ranked_keywords") {
      researched = true;
      await input.onProgress?.(`Step ${step} · Looking up search terms…`, journey);
      snapshot = await fetchSingaporeRankedKeywords(input.domain);
      observation = snapshotPrompt(snapshot);
      await input.onProgress?.(
        snapshot.error
          ? `Step ${step} · Keyword lookup failed: ${snapshot.error}`
          : `Step ${step} · Found ${snapshot.keywords.length} search terms`,
        journey,
      );
      if (!snapshot.error) {
        found.push(snapshotPrompt(snapshot).slice(0, 500));
      }
    } else if (action.tool === "course_notes") {
      await input.onProgress?.(`Step ${step} · Reading the method notes…`, journey);
      const chunks = await loadKnowledgeChunks();
      observation = knowledgePrompt(
        rankChunks(chunks, `${input.domain} ${input.brandName} ${action.query}`),
      );
      await input.onProgress?.(`Step ${step} · Method notes ready`, journey);
    } else if (action.tool === "set_journey") {
      journey = applyJourney(journey, { current: action.current, done: action.done });
      observation = JSON.stringify(journey);
      await input.onProgress?.(`Step ${step} · Map moved to ${journey.current}`, journey);
    }
    transcript.push({ role: "user", content: `Tool result:\n${observation}` });
  }

  if (found.length) {
    return {
      markdown: `## Site check\n\nThese are different real pages from the sitemap and the site.\n\n${found.join("\n\n")}`,
      journey,
      snapshot,
    };
  }
  throw new Error("The assistant used up its research rounds without a finished answer.");
}
