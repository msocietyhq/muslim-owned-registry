import { runtimeEnv } from "@/lib/runtime-env";
import { withCache } from "@/lib/seo-geo/cache";

export type KeywordSnapshot = {
  keyword: string;
  volume: number | null;
  position: number | null;
};

export type DomainSnapshot = {
  fetchedAt: string;
  location: string;
  total: number | null;
  keywords: KeywordSnapshot[];
  error: string | null;
};

export type SearchMarket = { label: string; code: number };

type RankedItem = {
  keyword_data?: {
    keyword?: string;
    keyword_info?: { search_volume?: number };
  };
  ranked_serp_element?: {
    serp_item?: { rank_group?: number };
  };
};

export async function fetchRankedKeywords(domain: string, market: SearchMarket): Promise<DomainSnapshot> {
  let fresh: DomainSnapshot | null = null;
  const saved = await withCache<DomainSnapshot>(`keywords:${market.code}:${domain.toLowerCase()}`, async () => {
    fresh = await loadRankedKeywords(domain, market);
    return fresh.error ? null : fresh;
  });
  if (saved) return saved;
  return fresh || loadRankedKeywords(domain, market);
}

export function fetchSingaporeRankedKeywords(domain: string) {
  return fetchRankedKeywords(domain, { label: "Singapore", code: 2702 });
}

async function loadRankedKeywords(domain: string, market: SearchMarket): Promise<DomainSnapshot> {
  const login = runtimeEnv("DATAFORSEO_LOGIN");
  const password = runtimeEnv("DATAFORSEO_PASSWORD");
  const fetchedAt = new Date().toISOString();
  if (!login || !password) {
    return {
      fetchedAt,
      location: market.label,
      total: null,
      keywords: [],
      error: "Search data is not configured.",
    };
  }
  const auth = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  try {
    const response = await fetch(
      "https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            target: domain,
            location_code: market.code,
            language_code: "en",
            item_types: ["organic"],
            limit: 15,
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
            filters: ["keyword_data.keyword_info.search_volume", ">", 0],
          },
        ]),
      },
    );
    const json = (await response.json()) as {
      status_code?: number;
      status_message?: string;
      tasks?: {
        status_code?: number;
        status_message?: string;
        result?: { total_count?: number; items?: RankedItem[] }[];
      }[];
    };
    const task = json.tasks?.[0];
    if (!response.ok || json.status_code !== 20000 || task?.status_code !== 20000) {
      return {
        fetchedAt,
        location: market.label,
        total: null,
        keywords: [],
        error: task?.status_message || json.status_message || "Search data request failed.",
      };
    }
    const result = task.result?.[0];
    const keywords = (result?.items || [])
      .map((item) => ({
        keyword: item.keyword_data?.keyword || "",
        volume: item.keyword_data?.keyword_info?.search_volume ?? null,
        position: item.ranked_serp_element?.serp_item?.rank_group ?? null,
      }))
      .filter((row) => row.keyword);
    return {
      fetchedAt,
      location: market.label,
      total: result?.total_count ?? keywords.length,
      keywords,
      error: null,
    };
  } catch {
    return {
      fetchedAt,
      location: market.label,
      total: null,
      keywords: [],
      error: "Search data could not be reached.",
    };
  }
}

export function snapshotPrompt(snapshot: DomainSnapshot | null) {
  if (!snapshot) return "No search snapshot yet.";
  if (snapshot.error) return `Search snapshot unavailable: ${snapshot.error}`;
  if (!snapshot.keywords.length) {
    return `Google ${snapshot.location} snapshot at ${snapshot.fetchedAt}: no organic keywords with search volume were returned. Total reported: ${snapshot.total ?? 0}.`;
  }
  const lines = snapshot.keywords
    .map(
      (row) =>
        `- ${row.keyword}: volume ${row.volume ?? "unknown"}, approximate position ${row.position ?? "unknown"}`,
    )
    .join("\n");
  return `Google ${snapshot.location} organic snapshot at ${snapshot.fetchedAt}. This is search evidence for ${snapshot.location} only, not proof of every market.\nReported keyword count: ${snapshot.total ?? snapshot.keywords.length}.\n${lines}`;
}
