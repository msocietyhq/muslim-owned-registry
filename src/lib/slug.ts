export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function brandSlugPrefix(brandName: string): string {
  const prefix = slugify(brandName);
  if (!prefix) {
    throw new Error("Brand name must contain letters or numbers so a slug can be generated.");
  }
  return prefix;
}

export function assertBrandPrefixedSlug(brandName: string, slug: string) {
  const prefix = brandSlugPrefix(brandName);
  const normalized = slugify(slug);
  if (normalized !== slug) {
    throw new Error("Use lowercase letters, numbers, and hyphens only.");
  }
  if (normalized !== prefix && !normalized.startsWith(`${prefix}-`)) {
    throw new Error(
      `Slug must be “${prefix}” or start with “${prefix}-” (the brand name).`,
    );
  }
  return normalized;
}

/** If `base` is taken, use `base-2`, then `base-3`, and so on. Never uses `-1`. */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n <= 999; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a page link.");
}
