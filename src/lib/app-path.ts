export function safeAppPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim().split("?")[0]?.split("#")[0] || "";
  if (!path.startsWith("/app")) return null;
  if (path.includes("//") || path.includes("\\")) return null;
  if (!/^\/app(?:\/[A-Za-z0-9._~-]+)*$/.test(path)) return null;
  return path;
}

export function listingOwnerAppPath(id: string) {
  return `/app/businesses/${id}`;
}

export function keepLoginNextPath(
  existing: { nextPath?: unknown; expiresAt?: unknown } | undefined,
  requested?: unknown,
  now = Date.now(),
): string | null {
  const fromRequest = safeAppPath(requested);
  if (fromRequest) return fromRequest;
  if (!existing) return null;
  if (typeof existing.expiresAt !== "string") return null;
  const expiresAt = Date.parse(existing.expiresAt);
  if (Number.isNaN(expiresAt) || expiresAt < now) return null;
  return safeAppPath(existing.nextPath);
}
