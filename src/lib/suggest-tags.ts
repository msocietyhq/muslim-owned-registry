import type { Tag } from "@/lib/types";
import { runtimeEnv } from "@/lib/runtime-env";

const KEYWORDS: Record<string, string[]> = {
  food: ["food", "makan", "nasi", "kitchen", "cook", "meal", "lunch", "dinner"],
  catering: ["cater", "kenduri", "buffet", "tray"],
  bakery: ["bakery", "cake", "kueh", "bread", "pastry", "dessert"],
  restaurant: ["restaurant", "cafe", "warung", "warong", "eatery", "dining"],
  hawker: ["hawker", "stall"],
  venue: ["venue", "hall", "studio", "space", "ballroom"],
  hall: ["hall", "ballroom", "function"],
  studio: ["studio"],
  "party-logistics": ["party", "event", "wedding", "walimah"],
  decor: ["decor", "décor", "balloon", "flower"],
  rental: ["rental", "rent", "hire"],
  photography: ["photo", "photograph", "videograph"],
  services: ["service", "repair", "fix", "clean"],
  retail: ["shop", "store", "boutique", "retail"],
  education: ["tuition", "tutor", "class", "school", "learn", "course"],
  health: ["clinic", "dental", "physio", "health", "therapy", "doctor"],
  professional: ["account", "legal", "lawyer", "consult", "tax", "payroll"],
};

export function heuristicTagIds(text: string, tags: Tag[], limit = 4): string[] {
  const hay = text.toLowerCase();
  const scored = tags
    .map((tag) => {
      const needles = [
        tag.name.toLowerCase(),
        tag.slug.replace(/-/g, " "),
        ...(KEYWORDS[tag.slug] || KEYWORDS[tag.id] || []),
      ];
      const score = needles.reduce((sum, needle) => {
        if (!needle || needle.length < 3) return sum;
        return hay.includes(needle) ? sum + (needle === tag.name.toLowerCase() ? 3 : 1) : sum;
      }, 0);
      return { id: tag.id, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked: string[] = [];
  for (const row of scored) {
    if (picked.includes(row.id)) continue;
    picked.push(row.id);
    if (picked.length >= limit) break;
  }
  return picked;
}

export async function suggestTagIds(params: {
  brandName: string;
  summary: string;
  description: string;
  tags: Tag[];
}): Promise<string[]> {
  const allowed = new Set(params.tags.map((tag) => tag.id));
  const fallback = heuristicTagIds(
    `${params.brandName} ${params.summary} ${params.description}`,
    params.tags,
  );
  const key = runtimeEnv("DEEPSEEK_API_KEY");
  if (!key || params.tags.length === 0) return fallback;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Pick the most relevant directory tags for a Singapore Muslim-owned business. Use only ids from the supplied list. Reply JSON: {\"tagIds\":[\"id\"]}. Return 1 to 4 ids. If unsure, return [].",
          },
          {
            role: "user",
            content: JSON.stringify({
              brandName: params.brandName,
              summary: params.summary,
              description: params.description.slice(0, 1200),
              tags: params.tags.map((tag) => ({ id: tag.id, name: tag.name })),
            }),
          },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as {
      tagIds?: unknown;
    };
    const ids = (Array.isArray(parsed.tagIds) ? parsed.tagIds : [])
      .map(String)
      .filter((id) => allowed.has(id))
      .slice(0, 4);
    return ids.length ? ids : fallback;
  } catch {
    return fallback;
  }
}
