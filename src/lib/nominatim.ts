import { parseLatLng, type LatLng } from "@/lib/geo";

const NOMINATIM = "https://nominatim.openstreetmap.org";
let lastNominatimAt = 0;

function headers() {
  return {
    Accept: "application/json",
    "User-Agent": "muslimowned.sg/1.0 (afiq980@gmail.com)",
  };
}

async function throttleNominatim() {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimAt = Date.now();
}

export async function geocodeSingapore(query: string): Promise<LatLng | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  const url = `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=sg&q=${encodeURIComponent(q)}`;
  await throttleNominatim();
  const response = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!response.ok) return null;
  const rows = (await response.json()) as { lat?: string; lon?: string }[];
  const first = rows[0];
  return parseLatLng(first?.lat, first?.lon);
}

export async function searchSingaporePlaces(query: string) {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=sg&q=${encodeURIComponent(q)}`;
  await throttleNominatim();
  const response = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!response.ok) return [];
  const rows = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  }[];
  return rows
    .map((row) => {
      const point = parseLatLng(row.lat, row.lon);
      if (!point) return null;
      return { ...point, label: row.display_name || query };
    })
    .filter((row): row is LatLng & { label: string } => row !== null);
}
