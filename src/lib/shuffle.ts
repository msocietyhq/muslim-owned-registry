export function shufflePick<T>(items: T[], count: number, random = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, count));
}

/** Weighted sample without replacement (Efraimidis–Spirakis). */
export function shufflePickWeighted<T>(
  items: T[],
  count: number,
  weight: (item: T) => number,
  random = Math.random,
): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (items.length <= count) return shufflePick(items, items.length, random);
  const ranked = items.map((item) => {
    const w = Math.max(0, weight(item));
    const key = w <= 0 ? Number.NEGATIVE_INFINITY : Math.pow(random(), 1 / w);
    return { item, key };
  });
  ranked.sort((a, b) => b.key - a.key);
  return ranked.slice(0, count).map((row) => row.item);
}
