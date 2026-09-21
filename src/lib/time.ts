export function monthsAgo(iso: string, now = new Date()) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const days = Math.max(0, (now.getTime() - then.getTime()) / 86_400_000);
  return Math.floor(days / 30);
}

export function formatUpdatedAgo(
  iso: string | null | undefined,
  copy: { thisMonth: string; oneMonth: string; monthsAgo: string },
  now = new Date(),
) {
  if (!iso) return "";
  const months = monthsAgo(iso, now);
  if (months <= 0) return copy.thisMonth || "Updated this month";
  if (months === 1) return copy.oneMonth || "Updated 1 month ago";
  return (copy.monthsAgo || "Updated {n} months ago").replace("{n}", String(months));
}
