import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getTags } from "@/lib/data";
import { geocodeSingapore } from "@/lib/nominatim";
import {
  LISTING_AI_BAD_URL,
  LISTING_AI_BLOCKED,
  LISTING_AI_FETCH_FAIL,
  LISTING_AI_NEED_SOURCE,
  clipPageText,
  emptyPageHints,
  extractPageHints,
  heuristicListingDraft,
  isBlockedHostname,
  isPrivateIp,
  parseListingAiJson,
  parseSourceWebsite,
  sameOriginStylesheetUrls,
  type ListingAiDraft,
  type PageHints,
} from "@/lib/listing-ai";
import { extractPageColorHints, mergePageColorHints } from "@/lib/listing-colors";
import { parsePhotos } from "@/lib/photos";
import { suggestTagIds } from "@/lib/suggest-tags";

const FETCH_MS = 12000;
const MAX_HTML = 1_200_000;
const MAX_VISION_BYTES = 4_000_000;
const EXTRA_PATHS = ["/contact", "/about", "/contact-us", "/about-us"];

export async function completeListingFromSources(input: {
  website?: string | null;
  photos?: string[] | null;
}): Promise<ListingAiDraft> {
  const photos = parsePhotos(input.photos);
  const websiteRaw = typeof input.website === "string" ? input.website.trim() : "";
  if (!websiteRaw && !photos.length) {
    throw new Error(LISTING_AI_NEED_SOURCE);
  }
  if (!websiteRaw) {
    const draft = await fillWithModel(emptyPageHints(), photos, "");
    return geocodeIfNeeded(draft);
  }

  const website = parseSourceWebsite(websiteRaw);
  const pages = await fetchWebsitePages(website);
  const extraCss = await fetchLinkedCss(pages);
  const combined = combineHints(pages, website, extraCss);
  const draft = await fillWithModel(combined, photos, website);
  return geocodeIfNeeded(draft);
}

export async function fetchWebsitePages(startUrl: string) {
  const first = await fetchPublicHtml(startUrl);
  const pages = [first];
  const origin = new URL(first.finalUrl).origin;
  for (const path of EXTRA_PATHS) {
    if (pages.length >= 3) break;
    const next = `${origin}${path}`;
    if (pages.some((page) => page.finalUrl.replace(/\/$/, "") === next.replace(/\/$/, ""))) continue;
    try {
      pages.push(await fetchPublicHtml(next));
    } catch {
      continue;
    }
  }
  return pages;
}

async function fillWithModel(hints: PageHints, photos: string[], website: string): Promise<ListingAiDraft> {
  const fallback = heuristicListingDraft(hints, photos, website);
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return fallback;

  const imageParts = await listingAiImageParts(photos);
  const useVision = imageParts.length > 0;
  const payloadJson = JSON.stringify({
    website,
    title: hints.title,
    description: hints.description,
    emails: hints.emails.slice(0, 5),
    phones: hints.phones.slice(0, 5),
    uensOnPage: hints.uens,
    coloursOnPage: {
      themeColor: hints.themeColor,
      palette: hints.palette.slice(0, 12),
    },
    links: hints.links,
    text: hints.text,
    photoCount: photos.length,
    photosAreAlsoListingGallery: true,
  });
  const colourRule = useVision
    ? "primaryColor and secondaryColor are #rrggbb hex visible on the website or clearly visible as brand colours in the photos, or empty. Never invent a colour that is not on the page or in the photos."
    : "primaryColor and secondaryColor are #rrggbb hex from coloursOnPage, or empty. Never invent a colour that is not in coloursOnPage.";
  const uenRule = useVision
    ? "Never invent a UEN. Only include a UEN if it is in uensOnPage or you can read it clearly in a photo."
    : "Never invent a UEN.";
  const sourceRule = useVision
    ? "Read every photo (logos, posters, menus, product labels, shopfronts, flyers, screenshots) together with any website text to figure out what the business is and to fill the fields. The same photos also become the listing gallery."
    : "Extract a Singapore business listing draft from website text.";

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useVision
          ? process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash"
          : process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `${sourceRule} Reply JSON only with keys brandName, registeredName, uen, contactEmail, whatsapp, summary, description, address, locationMode, links, primaryColor, secondaryColor. links is {website,instagram,facebook,tiktok}. locationMode is online or pin. ${colourRule} primaryColor is a darker brand colour for the title and main button. secondaryColor is a distinct accent, not a text colour. Use empty strings when unknown. ${uenRule} summary max 280 characters. description can be a few short paragraphs. Do not mention Muslim ownership unless the page or a photo says it.`,
          },
          {
            role: "user",
            content: useVision
              ? [
                  {
                    type: "text",
                    text: payloadJson,
                  },
                  ...imageParts,
                ]
              : payloadJson,
          },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content || "{}";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    return parseListingAiJson(parsed, hints, photos, website);
  } catch {
    return fallback;
  }
}

type VisionImagePart = { type: "image_url"; image_url: { url: string } };

async function listingAiImageParts(photos: string[]): Promise<VisionImagePart[]> {
  const parts: VisionImagePart[] = [];
  for (const photo of photos) {
    const url = await photoAsModelUrl(photo);
    if (!url) continue;
    parts.push({ type: "image_url", image_url: { url } });
  }
  return parts;
}

async function photoAsModelUrl(photo: string, hop = 0): Promise<string> {
  if (photo.startsWith("data:image/")) return photo;
  if (!photo.startsWith("https://") || hop > 3) return "";
  try {
    const parsed = await assertPublicHttpsUrl(photo);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    try {
      const response = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "image/*",
          "User-Agent": "muslimowned.sg listing helper (afiq980@gmail.com)",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return parsed.toString();
        const next = await assertPublicHttpsUrl(new URL(location, parsed).toString());
        return photoAsModelUrl(next.toString(), hop + 1);
      }
      if (!response.ok) return parsed.toString();
      const type = response.headers.get("content-type") || "";
      if (!/^image\//i.test(type)) return parsed.toString();
      const buf = Buffer.from(await response.arrayBuffer());
      if (!buf.length || buf.length > MAX_VISION_BYTES) return parsed.toString();
      const mime = type.split(";")[0]?.trim() || "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return "";
  }
}

async function geocodeIfNeeded(draft: ListingAiDraft): Promise<ListingAiDraft> {
  if (!draft.address.trim()) {
    return { ...draft, locationMode: "online", lat: null, lng: null };
  }
  const pin = await geocodeSingapore(draft.address).catch(() => null);
  if (!pin) return { ...draft, locationMode: "online", lat: null, lng: null };
  return { ...draft, locationMode: "pin", lat: pin.lat, lng: pin.lng };
}

export async function suggestTagsForDraft(draft: ListingAiDraft) {
  const tags = await getTags();
  return suggestTagIds({
    brandName: draft.brandName,
    summary: draft.summary,
    description: draft.description,
    tags,
  });
}

function combineHints(
  pages: { finalUrl: string; html: string }[],
  website: string,
  extraCss = "",
): PageHints {
  const all = pages.map((page) => extractPageHints(page.html, page.finalUrl));
  const first = all[0] || extractPageHints("", website);
  const colors = mergePageColorHints([
    ...all,
    extractPageColorHints(extraCss),
  ]);
  return {
    title: first.title,
    description: first.description,
    text: clipPageText(all.map((item) => item.text).join(" ")),
    emails: unique(all.flatMap((item) => item.emails)),
    phones: unique(all.flatMap((item) => item.phones)),
    uens: unique(all.flatMap((item) => item.uens)),
    links: {
      website: first.links.website || website,
      instagram: all.map((item) => item.links.instagram).find(Boolean) || "",
      facebook: all.map((item) => item.links.facebook).find(Boolean) || "",
      tiktok: all.map((item) => item.links.tiktok).find(Boolean) || "",
    },
    themeColor: colors.themeColor,
    palette: colors.palette,
  };
}

async function fetchLinkedCss(pages: { finalUrl: string; html: string }[]) {
  const htmlColors = mergePageColorHints(pages.map((page) => extractPageColorHints(page.html)));
  if (htmlColors.themeColor && htmlColors.palette.length >= 3) return "";
  const urls = unique(pages.flatMap((page) => sameOriginStylesheetUrls(page.html, page.finalUrl)));
  const chunks: string[] = [];
  for (const url of urls.slice(0, 2)) {
    try {
      chunks.push((await fetchPublicCss(url)).text);
    } catch {
      continue;
    }
  }
  return chunks.join("\n");
}

async function fetchPublicHtml(rawUrl: string) {
  let current = await assertPublicHttpsUrl(rawUrl);
  for (let hop = 0; hop < 4; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "muslimowned.sg listing helper (afiq980@gmail.com)",
        },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch {
      throw new Error(LISTING_AI_FETCH_FAIL);
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(LISTING_AI_FETCH_FAIL);
      current = await assertPublicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(LISTING_AI_FETCH_FAIL);
    const type = response.headers.get("content-type") || "";
    if (type && !/html|xml|text\/plain/i.test(type)) throw new Error(LISTING_AI_FETCH_FAIL);
    const html = (await response.text()).slice(0, MAX_HTML);
    return { finalUrl: current.toString(), html };
  }
  throw new Error(LISTING_AI_FETCH_FAIL);
}

const MAX_CSS = 400_000;

async function fetchPublicCss(rawUrl: string) {
  let current = await assertPublicHttpsUrl(rawUrl);
  for (let hop = 0; hop < 4; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    let response: Response;
    try {
      response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/css,text/plain,*/*",
          "User-Agent": "muslimowned.sg listing helper (afiq980@gmail.com)",
        },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch {
      throw new Error(LISTING_AI_FETCH_FAIL);
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(LISTING_AI_FETCH_FAIL);
      current = await assertPublicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(LISTING_AI_FETCH_FAIL);
    const type = response.headers.get("content-type") || "";
    if (type && /html/i.test(type) && !/css/i.test(type)) throw new Error(LISTING_AI_FETCH_FAIL);
    const text = (await response.text()).slice(0, MAX_CSS);
    return { finalUrl: current.toString(), text };
  }
  throw new Error(LISTING_AI_FETCH_FAIL);
}

export async function assertPublicHttpsUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(parseSourceWebsite(raw));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(LISTING_AI_BAD_URL);
  }
  if (parsed.protocol !== "https:") throw new Error(LISTING_AI_BAD_URL);
  if (isBlockedHostname(parsed.hostname)) throw new Error(LISTING_AI_BLOCKED);
  if (isIP(parsed.hostname) && isPrivateIp(parsed.hostname)) throw new Error(LISTING_AI_BLOCKED);
  const { address } = await lookup(parsed.hostname).catch(() => {
    throw new Error(LISTING_AI_FETCH_FAIL);
  });
  if (isPrivateIp(address)) throw new Error(LISTING_AI_BLOCKED);
  return parsed;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
