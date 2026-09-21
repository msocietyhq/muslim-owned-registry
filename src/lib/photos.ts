export const MAX_PHOTOS = 5;

export function parsePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isPublicPhoto(item) || seen.has(item)) continue;
    seen.add(item);
    next.push(item);
    if (next.length === MAX_PHOTOS) break;
  }
  return next;
}

export function isPublicPhoto(value: string) {
  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
}

export function movePhoto(photos: string[], index: number, delta: number) {
  const target = index + delta;
  if (index < 0 || index >= photos.length || target < 0 || target >= photos.length) {
    return photos;
  }
  const next = [...photos];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
