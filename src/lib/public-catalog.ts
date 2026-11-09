export const PUBLIC_PAGE_SIZE = 50;

export function pageByName<T extends { id: string; brandName: string }>(items: T[], page: number) {
  const sorted = [...items].sort(
    (a, b) =>
      a.brandName.localeCompare(b.brandName, "en", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / PUBLIC_PAGE_SIZE);
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const start = (requested - 1) * PUBLIC_PAGE_SIZE;
  const listings = start >= total ? [] : sorted.slice(start, start + PUBLIC_PAGE_SIZE);
  const hasNext = requested < totalPages;
  return {
    page: requested,
    pageSize: PUBLIC_PAGE_SIZE,
    total,
    totalPages,
    listings,
    hasNext,
  };
}
