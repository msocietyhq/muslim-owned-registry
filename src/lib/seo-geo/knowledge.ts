import { initAdmin } from "@/lib/firebase/admin";
import { redactVendorNames } from "@/lib/seo-geo/redact";

export const KNOWLEDGE_COLLECTION = "seo_geo_knowledge";

export type KnowledgeChunk = {
  id: string;
  lesson: string;
  title: string;
  text: string;
};

const FALLBACK = redactVendorNames(`
SEO and GEO method

Use evidence before you decide. Research the market, the words customers use, the current search results, competitors, and your own site. Then make the judgment yourself: what fits this company, this buyer, and the constraint in front of you. Use software only after that, to speed research, drafting, and repeated checks.

A useful page helps a real person understand a problem, compare options, decide, or take a next step. Prefer searches close to a commercial decision. Rankings, citations, and enquiries take time and are not guaranteed.

Work in this order:
1. Clarify what the business sells, who buys, and the language they use.
2. Build a sourced keyword pool and choose a small starting set. Record why each keyword was kept or rejected.
3. Check that search engines can reach and understand the site and the page: title, description, one clear H1, opening copy, and URL.
4. Match one keyword to a page type: guide, comparison, list, landing page, or a practical tool. The page should answer the reader's job.
5. Draft, review claims against approved company facts, then publish one page.
6. Ask Google and Bing to index it. Record the status. Do not treat a request as proof of indexing.
7. Check one keyword at a time: is the page live, indexed, visible for the query, and leading to the intended action? Change one evidenced thing, then look again.
8. Scale only after one page works. A set of pages needs a distinct reader need and enough evidence on each URL.

Success early on is being able to name the search, the buyer question, and the decision a page supports. Later success is a live URL, an index status, a relevant result, and a useful action.
`);

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

export function rankChunks(chunks: KnowledgeChunk[], query: string, limit = 6) {
  const wanted = new Set(tokens(query));
  const scored = chunks
    .map((chunk) => {
      const hay = tokens(`${chunk.lesson} ${chunk.title} ${chunk.text}`);
      let score = 0;
      for (const word of hay) {
        if (wanted.has(word)) score += 1;
      }
      if (wanted.size === 0) score = 1;
      return { chunk, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.title.localeCompare(b.chunk.title));
  const picked = scored.slice(0, limit).map((row) => row.chunk);
  return picked.length ? picked : chunks.slice(0, Math.min(limit, chunks.length));
}

export function knowledgePrompt(chunks: KnowledgeChunk[]) {
  const body = chunks
    .map((chunk) => `## ${chunk.lesson}: ${chunk.title}\n${chunk.text}`)
    .join("\n\n");
  return redactVendorNames(body || FALLBACK).slice(0, 14000);
}

let cache: { at: number; chunks: KnowledgeChunk[] } | null = null;

export async function loadKnowledgeChunks() {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.chunks;
  const { db } = initAdmin();
  const snap = await db.collection(KNOWLEDGE_COLLECTION).get();
  const chunks = snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        lesson: String(data.lesson || ""),
        title: String(data.title || ""),
        text: String(data.text || ""),
      };
    })
    .filter((chunk) => chunk.text);
  cache = { at: Date.now(), chunks };
  return chunks;
}

export function chunkCourseMarkdown(markdown: string, lesson: string): KnowledgeChunk[] {
  const cleaned = redactVendorNames(markdown);
  const parts = cleaned.split(/\n(?=#{1,3} )/);
  const chunks: KnowledgeChunk[] = [];
  for (const part of parts) {
    const lines = part.trim().split("\n");
    const title = (lines[0] || lesson).replace(/^#{1,3}\s*/, "").slice(0, 180);
    const text = lines.slice(1).join("\n").trim() || part.trim();
    if (text.length < 80) continue;
    const blocks = text.length > 3500 ? splitLength(text, 3500) : [text];
    blocks.forEach((block, index) => {
      chunks.push({
        id: "",
        lesson,
        title: blocks.length > 1 ? `${title} (${index + 1})` : title,
        text: block,
      });
    });
  }
  return chunks;
}

function splitLength(text: string, size: number) {
  const blocks: string[] = [];
  let rest = text;
  while (rest.length > size) {
    const cut = rest.lastIndexOf("\n\n", size);
    const at = cut > 400 ? cut : size;
    blocks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) blocks.push(rest);
  return blocks;
}
