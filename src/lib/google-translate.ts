import type { Lang } from "@/lib/i18n";

const cache = new Map<string, string>();

export function googleTarget(lang: Lang) {
  if (lang === "zh") return "zh-CN";
  if (lang === "ta") return "ta";
  if (lang === "ms") return "ms";
  return "en";
}

export function needsGoogleTranslate(lang: Lang) {
  return lang === "zh" || lang === "ta";
}

function cacheKey(text: string, lang: Lang) {
  return `${lang}:${text}`;
}

export async function translateText(text: string, lang: Lang, source = "en") {
  const trimmed = text.trim();
  if (!trimmed || !needsGoogleTranslate(lang)) return text;
  const hit = cache.get(cacheKey(trimmed, lang));
  if (hit !== undefined) return restoreSpacing(text, hit);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${googleTarget(lang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "muslimowned.sg/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return text;
    const payload = (await response.json()) as unknown;
    const translated = readGtx(payload) || trimmed;
    cache.set(cacheKey(trimmed, lang), translated);
    return restoreSpacing(text, translated);
  } catch {
    return text;
  }
}

export async function translateMany(texts: string[], lang: Lang, source = "en") {
  const unique = [...new Set(texts.map((item) => item.trim()).filter(Boolean))];
  const missing = unique.filter((item) => !cache.has(cacheKey(item, lang)));
  const sep = "\n◇\n";
  const batches: string[][] = [];
  let batch: string[] = [];
  let size = 0;
  for (const item of missing) {
    if (batch.length && size + item.length + sep.length > 1500) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(item);
    size += item.length + sep.length;
  }
  if (batch.length) batches.push(batch);

  for (const group of batches) {
    if (group.length === 1) {
      await translateText(group[0]!, lang, source);
      continue;
    }
    const joined = group.join(sep);
    const translated = await translateText(joined, lang, source);
    const parts = translated.split(sep);
    if (parts.length === group.length) {
      group.forEach((item, index) => {
        cache.set(cacheKey(item, lang), parts[index]!.trim());
      });
    } else {
      for (const item of group) {
        await translateText(item, lang, source);
      }
    }
  }
  return texts.map((item) => {
    if (!item.trim() || !needsGoogleTranslate(lang)) return item;
    return restoreSpacing(item, cache.get(cacheKey(item.trim(), lang)) || item);
  });
}

const SKIP_KEYS = new Set(["brand", "htmlLang", "english", "malay", "chinese", "tamil"]);

export async function translateMessages<T>(node: T, lang: Lang): Promise<T> {
  if (!needsGoogleTranslate(lang)) return node;
  const strings: string[] = [];
  walk(node, (value, key) => {
    if (typeof value === "string" && !SKIP_KEYS.has(key)) strings.push(value);
  });
  await translateMany(strings, lang);
  return mapTree(node, (value, key) => {
    if (typeof value !== "string" || SKIP_KEYS.has(key)) return value;
    return restoreSpacing(value, cache.get(cacheKey(value.trim(), lang)) || value);
  });
}

export async function translateContent(text: string, lang: Lang) {
  if (!text.trim() || !needsGoogleTranslate(lang)) return text;
  const tokens: string[] = [];
  const protectedText = text.replace(
    /(\[[^\]]*\]\([^)]+\)|https?:\/\/[^\s)]+|\/biz\/[a-z0-9-]+|muslimowned\.sg|OpenStreetMap|LinkedIn|\bMUIS\b|\bUEN\b)/gi,
    (match) => {
      const token = `⟨${tokens.length}⟩`;
      tokens.push(match);
      return token;
    },
  );
  const translated = (
    await Promise.all(splitForTranslate(protectedText).map((chunk) => translateText(chunk, lang)))
  ).join("");
  return translated.replace(/⟨(\d+)⟩/g, (_, index) => tokens[Number(index)] || "");
}

function readGtx(payload: unknown) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return "";
  return (payload[0] as unknown[])
    .map((row) => (Array.isArray(row) && typeof row[0] === "string" ? row[0] : ""))
    .join("");
}

function restoreSpacing(original: string, translated: string) {
  const lead = original.match(/^\s*/)?.[0] || "";
  const tail = original.match(/\s*$/)?.[0] || "";
  return `${lead}${translated.trim()}${tail}`;
}

function splitForTranslate(text: string, max = 1500) {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max * 0.4) cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.4) cut = rest.lastIndexOf(". ", max);
    if (cut < max * 0.4) cut = max;
    else if (rest.slice(cut, cut + 2) === ". ") cut += 2;
    else cut += 1;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function walk(node: unknown, visit: (value: string, key: string) => void, key = "") {
  if (typeof node === "string") {
    visit(node, key);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit, key));
    return;
  }
  if (node && typeof node === "object") {
    for (const [nextKey, value] of Object.entries(node)) {
      walk(value, visit, nextKey);
    }
  }
}

function mapTree<T>(node: T, visit: (value: string, key: string) => string, key = ""): T {
  if (typeof node === "string") return visit(node, key) as T;
  if (Array.isArray(node)) {
    return node.map((item) => mapTree(item, visit, key)) as T;
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [nextKey, value] of Object.entries(node)) {
      out[nextKey] = mapTree(value, visit, nextKey);
    }
    return out as T;
  }
  return node;
}
