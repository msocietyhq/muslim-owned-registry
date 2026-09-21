export type LatLng = { lat: number; lng: number };

/** Singapore plus a little sea margin, so a pin stays on this island. */
export const SG_BOUNDS = {
  minLat: 1.15,
  maxLat: 1.48,
  minLng: 103.6,
  maxLng: 104.1,
};

export const SG_CENTER: LatLng = { lat: 1.3521, lng: 103.8198 };

export const SG_PLACES: Record<string, LatLng> = {
  "jurong west": { lat: 1.3396, lng: 103.7063 },
  "jurong east": { lat: 1.3331, lng: 103.742 },
  tampines: { lat: 1.353, lng: 103.945 },
  woodlands: { lat: 1.438, lng: 103.789 },
  bedok: { lat: 1.324, lng: 103.93 },
  clementi: { lat: 1.315, lng: 103.765 },
  "ang mo kio": { lat: 1.37, lng: 103.849 },
  punggol: { lat: 1.405, lng: 103.902 },
  sengkang: { lat: 1.391, lng: 103.895 },
  yishun: { lat: 1.43, lng: 103.835 },
  "pasir ris": { lat: 1.372, lng: 103.949 },
  "bukit batok": { lat: 1.349, lng: 103.749 },
  queenstown: { lat: 1.294, lng: 103.806 },
  orchard: { lat: 1.304, lng: 103.832 },
  geylang: { lat: 1.32, lng: 103.891 },
  "toa payoh": { lat: 1.334, lng: 103.857 },
  bishan: { lat: 1.351, lng: 103.848 },
  hougang: { lat: 1.371, lng: 103.892 },
  "choa chu kang": { lat: 1.385, lng: 103.744 },
  "bukit panjang": { lat: 1.378, lng: 103.762 },
  "marine parade": { lat: 1.303, lng: 103.907 },
  serangoon: { lat: 1.355, lng: 103.868 },
  kallang: { lat: 1.31, lng: 103.866 },
  tuas: { lat: 1.321, lng: 103.649 },
  changi: { lat: 1.345, lng: 103.983 },
  sembawang: { lat: 1.449, lng: 103.82 },
  "bukit timah": { lat: 1.329, lng: 103.802 },
  "telok blangah": { lat: 1.27, lng: 103.823 },
  "tanjong pagar": { lat: 1.276, lng: 103.846 },
  "marina bay": { lat: 1.283, lng: 103.86 },
};

export function isValidSgPin(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SG_BOUNDS.minLat &&
    lat <= SG_BOUNDS.maxLat &&
    lng >= SG_BOUNDS.minLng &&
    lng <= SG_BOUNDS.maxLng
  );
}

export function parseLatLng(lat: unknown, lng: unknown): LatLng | null {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const next = { lat: Number(lat), lng: Number(lng) };
  return isValidSgPin(next.lat, next.lng) ? next : null;
}

export function submittedPin(lat: unknown, lng: unknown): LatLng | null {
  if (lat == null && lng == null) return null;
  const pin = parseLatLng(lat, lng);
  if (!pin) {
    throw new Error(
      "The map pin must be in Singapore, or leave it empty for an online business.",
    );
  }
  return pin;
}

export function businessPin(row: { lat?: number | null; lng?: number | null }) {
  return parseLatLng(row.lat, row.lng);
}

export function formatKm(km: number, lang: "en" | "ms" | "zh" | "ta" = "en") {
  const rounded = km < 1 ? Math.round(km * 10) / 10 : Math.round(km);
  if (lang === "ms") return `Kira-kira ${rounded} km`;
  if (lang === "zh") return `约 ${rounded} 公里`;
  if (lang === "ta") return `சுமார் ${rounded} கி.மீ.`;
  return `About ${rounded} km`;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function extractPlace(text: string): { name: string; point: LatLng } | null {
  const hay = text.toLowerCase();
  const names = Object.keys(SG_PLACES).sort((a, b) => b.length - a.length);
  const found = names.find((name) => hay.includes(name));
  if (!found) return null;
  return { name: found, point: SG_PLACES[found]! };
}

export function looksLikePlaceSearch(text: string) {
  const hay = text.toLowerCase();
  if (/\b(near|around|in|at)\b/.test(hay)) return true;
  return extractPlace(hay) !== null;
}

export function nearbyBusinesses<T extends { lat?: number | null; lng?: number | null }>(
  origin: LatLng,
  items: T[],
  radiusKm = 8,
) {
  const ranked = items
    .map((item) => {
      const pin = parseLatLng(item.lat, item.lng);
      return { item, km: pin ? haversineKm(origin, pin) : null };
    })
    .filter((row) => row.km !== null)
    .sort((a, b) => (a.km || 0) - (b.km || 0));
  const within = ranked.filter((row) => (row.km || 0) <= radiusKm);
  return (within.length ? within : ranked.slice(0, 8)) as {
    item: T;
    km: number;
  }[];
}

export function osmEmbedUrl(point: LatLng) {
  const pad = 0.01;
  const bbox = [
    point.lng - pad,
    point.lat - pad,
    point.lng + pad,
    point.lat + pad,
  ].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat}%2C${point.lng}`;
}

export function osmPageUrl(point: LatLng) {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=16/${point.lat}/${point.lng}`;
}
