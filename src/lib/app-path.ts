export function safeAppPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = cleanPath(raw);
  if (!path.startsWith("/app")) return null;
  if (!/^\/app(?:\/[A-Za-z0-9._~-]+)*$/.test(path)) return null;
  return path;
}

export function safeAdminPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = cleanPath(raw);
  if (path === "/admin") return "/admin";
  if (!path.startsWith("/admin/")) return null;
  if (!/^\/admin(?:\/[A-Za-z0-9._~-]+)+$/.test(path)) return null;
  return path;
}

export function safeToolsPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = cleanPath(raw);
  if (path === "/tools") return "/tools";
  if (!path.startsWith("/tools/")) return null;
  if (!/^\/tools(?:\/[A-Za-z0-9._~-]+)+$/.test(path)) return null;
  return path;
}

export function safeSessionPath(raw: unknown): string | null {
  return safeAppPath(raw) || safeAdminPath(raw) || safeToolsPath(raw);
}

export function listingOwnerAppPath(id: string) {
  return `/app/businesses/${id}`;
}

export const ADMIN_TASKS_HREF = "/admin#tasks";

export function sessionRedirect(raw: unknown): string {
  const path = safeSessionPath(raw);
  if (path === "/admin") return ADMIN_TASKS_HREF;
  return path || "/app";
}

export function keepLoginNextPath(
  existing: { nextPath?: unknown; expiresAt?: unknown } | undefined,
  requested?: unknown,
  now = Date.now(),
): string | null {
  const fromRequest = safeSessionPath(requested);
  if (fromRequest) return fromRequest;
  if (!existing) return null;
  if (typeof existing.expiresAt !== "string") return null;
  const expiresAt = Date.parse(existing.expiresAt);
  if (Number.isNaN(expiresAt) || expiresAt < now) return null;
  return safeSessionPath(existing.nextPath);
}

function cleanPath(raw: string) {
  const path = raw.trim().split("?")[0]?.split("#")[0] || "";
  if (path.includes("//") || path.includes("\\")) return "";
  return path;
}
