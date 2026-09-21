export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export type SessionUser = {
  uid: string;
  email?: string;
  name?: string | null;
};

export async function readSession() {
  const response = await fetch("/api/session", { credentials: "include" });
  return (await response.json()) as { user: SessionUser | null; isAdmin: boolean };
}
