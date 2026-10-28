import { websiteHost } from "@/lib/seo-geo/domains";
import { withCache } from "@/lib/seo-geo/cache";

function allowedHost(domain: string, host: string) {
  const wanted = domain.toLowerCase().replace(/^www\./, "");
  const got = host.toLowerCase().replace(/^www\./, "");
  return got === wanted;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(html: string, tag: RegExp, name: string) {
  const block = html.match(tag)?.[0] || "";
  return (
    block.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ||
    block.match(new RegExp(`${name}=([^\\s>]+)`, "i"))?.[1] ||
    ""
  );
}

export function pageKey(raw: string) {
  const host = websiteHost(raw);
  if (!host) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    const url = new URL(withScheme);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

export function sitemapLocs(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

export function htmlLinks(html: string, pageUrl: string) {
  const links: string[] = [];
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl);
      url.hash = "";
      links.push(url.toString());
    } catch {
      continue;
    }
  }
  return links;
}

export function diversePages(urls: string[], limit = 18) {
  const unique = new Map<string, string>();
  for (const url of urls) {
    const key = pageKey(url);
    if (key && !unique.has(key)) unique.set(key, url);
  }
  const rows = [...unique.values()];
  const posts = rows.filter((url) => /\/post\//i.test(url));
  const guides = rows.filter((url) => /\/guides?\//i.test(url));
  const core = rows.filter((url) => !/\/post\//i.test(url) && !/\/guides?\//i.test(url));
  return [...core, ...guides, ...posts.slice(0, 6)].slice(0, limit);
}

export function suggestRealPages(requested: string, known: string[], limit = 5) {
  const tokens = requested.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 3);
  const ranked = known
    .map((url) => ({
      url,
      score: tokens.reduce((total, token) => total + (url.toLowerCase().includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length);
  const matched = ranked.filter((row) => row.score > 0).slice(0, limit);
  return (matched.length ? matched : ranked.slice(0, limit)).map((row) => row.url);
}

export function pageIsOnDomain(domain: string, rawUrl: string) {
  const host = websiteHost(rawUrl);
  return Boolean(host && allowedHost(domain, host));
}

export async function fetchSitePage(domain: string, rawUrl: string) {
  const withScheme = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  if (!pageIsOnDomain(domain, withScheme)) {
    return { ok: false as const, error: "That URL is not on this company website." };
  }
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false as const, error: "That URL is not valid." };
  }
  const key = pageKey(parsed.toString());
  if (key) {
    const saved = await withCache(`page:${key}`, () => loadSitePage(domain, parsed));
    if (saved) return { ...saved, cached: true as const };
  }
  const fresh = await loadSitePage(domain, parsed);
  return fresh || { ok: false as const, error: "The page could not be fetched." };
}

async function loadSitePage(domain: string, parsed: URL) {
  try {
    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "muslimowned.sg SEO assistant" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    const html = (await response.text()).slice(0, 200_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
    if (!response.ok || response.status >= 400 || /not found/i.test(title)) return null;
    const description =
      attr(html, /<meta[^>]+name=["']description["'][^>]*>/i, "content") ||
      attr(html, /<meta[^>]+property=["']og:description["'][^>]*>/i, "content");
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
    const links = htmlLinks(html, response.url || parsed.toString()).filter((link) =>
      pageIsOnDomain(domain, link),
    );
    return {
      ok: true as const,
      url: response.url || parsed.toString(),
      status: response.status,
      title,
      description,
      h1: stripTags(h1).slice(0, 300),
      text: stripTags(html).slice(0, 5000),
      links: [...new Set(links)].slice(0, 40),
      cached: false as const,
    };
  } catch {
    return null;
  }
}

async function readText(url: string) {
  const saved = await withCache(`text:${url}`, async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": "muslimowned.sg SEO assistant" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const text = (await response.text()).slice(0, 500_000);
    return text || null;
  });
  return saved || "";
}

export async function discoverSitePages(domain: string) {
  const found = new Set<string>();
  const seeds = [`https://${domain}/sitemap.xml`, `https://www.${domain}/sitemap.xml`];
  try {
    const robots = await readText(`https://${domain}/robots.txt`);
    for (const match of robots.matchAll(/^Sitemap:\s*(\S+)/gim)) seeds.push(match[1]);
  } catch {
    // A missing robots file still leaves the default sitemap.
  }
  const queue = [...new Set(seeds)].slice(0, 4);
  const seenXml = new Set<string>();
  while (queue.length && seenXml.size < 4 && found.size < 200) {
    const xmlUrl = queue.shift();
    if (!xmlUrl || seenXml.has(xmlUrl)) continue;
    seenXml.add(xmlUrl);
    let xml = "";
    try {
      xml = await readText(xmlUrl);
    } catch {
      continue;
    }
    for (const loc of sitemapLocs(xml)) {
      if (/\.xml($|\?)/i.test(loc) && !seenXml.has(loc)) queue.push(loc);
      else if (pageIsOnDomain(domain, loc)) found.add(loc.split("#")[0]);
    }
  }
  return [...found].slice(0, 200);
}
