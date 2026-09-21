import { getLiveBusinesses, getTags } from "@/lib/data";
import {
  extractPlace,
  haversineKm,
  looksLikePlaceSearch,
  parseLatLng,
  type LatLng,
} from "@/lib/geo";
import {
  CLOSE_MATCH_SCORE,
  listingMatchesQuery,
  listingMatchScore,
  listingTextFields,
  uniqueListings,
} from "@/lib/listing-search";
import { markdownPlainText } from "@/lib/markdown";
import { geocodeSingapore } from "@/lib/nominatim";

type Group = {
  title: string;
  reason: string;
  businesses: { slug: string; brandName: string }[];
};

export type CatalogRow = {
  slug: string;
  brandName: string;
  registeredName?: string | null;
  summary: string;
  description?: string;
  tags: string[];
  lat?: number | null;
  lng?: number | null;
  km?: number | null;
};

function aboutText(item: CatalogRow) {
  return `${item.brandName} ${item.registeredName || ""} ${item.summary} ${markdownPlainText(item.description || "")} ${item.tags.join(" ")}`.toLowerCase();
}

function rankByNeed(items: CatalogRow[], intent: string) {
  return [...items].sort(
    (a, b) =>
      listingMatchScore(intent, b) - listingMatchScore(intent, a) || (a.km ?? 99) - (b.km ?? 99),
  );
}

function catalogFields(item: CatalogRow) {
  return {
    brandName: item.brandName,
    registeredName: item.registeredName,
    summary: item.summary,
    description: item.description,
    tags: item.tags,
  };
}

function sortGroupBusinesses(
  businesses: { slug: string; brandName: string }[],
  catalog: CatalogRow[],
  intent: string,
) {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  return [...businesses].sort((a, b) => {
    const rowA = bySlug.get(a.slug);
    const rowB = bySlug.get(b.slug);
    const scoreA = rowA ? listingMatchScore(intent, catalogFields(rowA)) : 0;
    const scoreB = rowB ? listingMatchScore(intent, catalogFields(rowB)) : 0;
    return scoreB - scoreA || (rowA?.km ?? 99) - (rowB?.km ?? 99);
  });
}

function bestGroupScore(
  businesses: { slug: string; brandName: string }[],
  catalog: CatalogRow[],
  intent: string,
) {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  return businesses.reduce((best, item) => {
    const row = bySlug.get(item.slug);
    return Math.max(best, row ? listingMatchScore(intent, catalogFields(row)) : 0);
  }, 0);
}

function compactCatalogue(catalog: CatalogRow[]) {
  return catalog.map((row) => ({
    slug: row.slug,
    brandName: row.brandName,
    registeredName: row.registeredName || "",
    tags: row.tags,
    km: row.km ?? null,
    about: [row.summary, markdownPlainText(row.description || "").slice(0, 400)]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 520),
  }));
}

export function keepCatalogueSlugs(
  slugs: string[],
  catalogue: { slug: string; brandName: string; registeredName?: string | null }[],
) {
  const bySlug = new Map(catalogue.map((item) => [item.slug, item]));
  return uniqueListings(
    slugs
      .map((slug) => bySlug.get(slug))
      .filter((item): item is { slug: string; brandName: string; registeredName?: string | null } => Boolean(item))
      .map((item) => ({
        slug: item.slug,
        brandName: item.brandName,
        registeredName: item.registeredName,
      })),
  );
}

export function mergeTextMatches(intent: string, catalog: CatalogRow[], groups: Group[]): Group[] {
  const picked: { slug: string; brandName: string; registeredName?: string | null }[] = [];
  const unique: Group[] = [];

  for (const group of groups) {
    const businesses = uniqueListings(
      group.businesses.map((item) => {
        const row = catalog.find((entry) => entry.slug === item.slug);
        return {
          slug: item.slug,
          brandName: item.brandName,
          registeredName: row?.registeredName,
        };
      }),
    ).filter((item) => uniqueListings([...picked, item]).length > picked.length);
    picked.push(...businesses);
    if (businesses.length) {
      unique.push({
        ...group,
        businesses: sortGroupBusinesses(businesses, catalog, intent),
      });
    }
  }

  const extras = uniqueListings(
    catalog.filter((item) => listingMatchesQuery(intent, listingTextFields(item))),
  )
    .filter((item) => uniqueListings([...picked, item]).length > picked.length)
    .sort(
      (a, b) =>
        listingMatchScore(intent, catalogFields(b)) - listingMatchScore(intent, catalogFields(a)),
    );

  if (extras.length) {
    const extraGroup: Group = {
      title: "Matches from your search",
      reason: "These listings mention what you typed in the name or description.",
      businesses: extras.map((item) => ({ slug: item.slug, brandName: item.brandName })),
    };
    const extraBest = extras.reduce(
      (best, item) => Math.max(best, listingMatchScore(intent, catalogFields(item))),
      0,
    );
    const otherBest = unique.reduce(
      (best, group) => Math.max(best, bestGroupScore(group.businesses, catalog, intent)),
      0,
    );
    if (extraBest >= CLOSE_MATCH_SCORE || extraBest >= otherBest) unique.unshift(extraGroup);
    else unique.push(extraGroup);
  }

  return unique;
}

export function withDistance(catalog: CatalogRow[], origin: LatLng | null): CatalogRow[] {
  if (!origin) return catalog.map((row) => ({ ...row, km: null }));
  return catalog.map((row) => {
    const pin = parseLatLng(row.lat, row.lng);
    return {
      ...row,
      km: pin ? Math.round(haversineKm(origin, pin) * 10) / 10 : null,
    };
  });
}

export function preferNearby(items: CatalogRow[], radiusKm = 8): CatalogRow[] {
  if (!items.some((item) => item.km != null)) return items;
  const within = items.filter((item) => item.km == null || (item.km ?? 99) <= radiusKm);
  if (within.length) return within;
  return items
    .filter((item) => item.km != null)
    .sort((a, b) => (a.km || 0) - (b.km || 0))
    .slice(0, 8);
}

async function resolvePlace(intent: string): Promise<LatLng | null> {
  const known = extractPlace(intent);
  if (known) return known.point;
  if (!looksLikePlaceSearch(intent)) return null;
  return geocodeSingapore(intent);
}

export async function planFromIntent(intent: string): Promise<{
  groups: Group[];
  model: string;
}> {
  const [businesses, tags] = await Promise.all([getLiveBusinesses(), getTags()]);
  const tagName = (id: string) => tags.find((tag) => tag.id === id)?.name || id;
  const origin = await resolvePlace(intent);

  const catalog = withDistance(
    businesses.map((business) => ({
      slug: business.slug,
      brandName: business.brandName,
      registeredName: business.registeredName,
      summary: business.summary,
      description: business.description || "",
      tags: business.tagIds.map(tagName),
      lat: business.lat,
      lng: business.lng,
    })),
    origin,
  );

  if (!catalog.length) {
    return { groups: [], model: "none" };
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return { groups: heuristicPlan(intent, catalog, origin), model: "heuristic" };
  }

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You match a visitor's need to businesses from the supplied catalogue only. Match against brandName, tags, AND the about text (summary plus the owner's listing description). Prefer businesses whose description clearly covers the need, not only those whose tags overlap. The visitor may want one business or several, for any practical reason, not only events. Never invent names or slugs. Reply JSON: {\"groups\":[{\"title\":\"\",\"reason\":\"\",\"slugs\":[\"catalogue-slug\"]}]} . Group by the kind of help needed. Use 1-6 groups. Omit empty groups. If nothing fits, return {\"groups\":[]}. If rows have km, prefer smaller km when the visitor named a place. Rows with km null are online-only; include them when the need is not a nearby shop.",
        },
        {
          role: "user",
          content: JSON.stringify({ intent, catalogue: compactCatalogue(catalog) }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Planner upstream error: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content || "{\"groups\":[]}";
  let parsed: { groups?: { title?: string; reason?: string; slugs?: string[] }[] } = {
    groups: [],
  };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    parsed = { groups: [] };
  }
  const nearby = origin ? preferNearby(catalog) : catalog;
  const groups = (parsed.groups || [])
    .map((group) => ({
      title: String(group.title || "").slice(0, 80),
      reason: String(group.reason || "").slice(0, 280),
      businesses: keepCatalogueSlugs(group.slugs || [], origin ? nearby : catalog),
    }))
    .filter((group) => group.title && group.businesses.length);

  return { groups: mergeTextMatches(intent, catalog, groups), model };
}

export function heuristicPlan(
  intent: string,
  catalog: CatalogRow[],
  origin?: LatLng | null,
): Group[] {
  const text = intent.toLowerCase();
  const place = origin || extractPlace(intent)?.point || null;
  const ranked = withDistance(catalog, place);
  const wants = (needles: string[]) =>
    preferNearby(
      ranked.filter((item) =>
        needles.some(
          (needle) =>
            item.tags.join(" ").toLowerCase().includes(needle) ||
            item.summary.toLowerCase().includes(needle) ||
            markdownPlainText(item.description || "").toLowerCase().includes(needle) ||
            item.brandName.toLowerCase().includes(needle),
        ),
      ),
    );

  const groups: Group[] = [];
  const food = wants(["food", "catering", "bakery", "restaurant", "cake", "lunch", "dinner"]);
  const venue = wants(["venue", "space", "hall"]);
  const logistics = wants(["logistics", "party", "balloon", "rental", "decor"]);
  const trades = wants(["plumb", "repair", "electrical", "renovate", "paint", "clean", "mover"]);
  const media = wants(["photo", "video", "design", "print"]);

  const mentions = (needles: string[]) => needles.some((needle) => text.includes(needle));
  const eventLike = /party|birthday|kenduri|wedding|iftar|gathering|event|majlis/.test(text);

  function add(title: string, reason: string, items: CatalogRow[]) {
    if (!items.length) return;
    groups.push({
      title,
      reason,
      businesses: rankByNeed(items, intent).map((item) => ({
        slug: item.slug,
        brandName: item.brandName,
      })),
    });
  }

  if (eventLike || mentions(["food", "cater", "cake", "lunch", "dinner", "makan"])) {
    add("Food", "Food and catering.", food);
  }
  if (eventLike || mentions(["venue", "hall", "space", "dewan"])) {
    add("Venue", "Places that can host people.", venue);
  }
  if (eventLike || mentions(["decor", "balloon", "rental", "party"])) {
    add("Setup and extras", "Setup, décor, and related services.", logistics);
  }
  if (mentions(["plumb", "leak", "repair", "electrical", "renovate", "paint", "clean", "mover", "shift"])) {
    add("Home and trades", "Repair and household help.", trades);
  }
  if (mentions(["photo", "video", "design", "print", "camera"])) {
    add("Photo and design", "Photography and design.", media);
  }

  if (!groups.length) {
    const q = text.split(/\s+/).filter((part) => part.length > 3);
    const hits = rankByNeed(
      preferNearby(ranked.filter((item) => q.some((word) => aboutText(item).includes(word)))),
      intent,
    );
    if (hits.length) {
      groups.push({
        title: "Matches",
        reason: place
          ? "Nearby businesses that match what you asked for."
          : "Businesses that match what you asked for.",
        businesses: hits.map((item) => ({ slug: item.slug, brandName: item.brandName })),
      });
    }
  }

  return mergeTextMatches(intent, ranked, groups);
}
