import { sha256 } from "@/lib/crypto";
import { initAdmin } from "@/lib/firebase/admin";

export const SEO_GEO_CACHE_DAYS = 15;
export const SEO_GEO_CACHE_MS = SEO_GEO_CACHE_DAYS * 24 * 60 * 60 * 1000;
const COLLECTION = "seo_geo_cache";

const pending = new Map<string, Promise<unknown>>();

export function cacheExpiresAt(now = Date.now()) {
  return new Date(now + SEO_GEO_CACHE_MS).toISOString();
}

export function cacheIsFresh(expiresAt: string, now = Date.now()) {
  const at = Date.parse(expiresAt);
  return !Number.isNaN(at) && at > now;
}

async function readCache<T>(key: string): Promise<T | null> {
  const { db } = initAdmin();
  const snap = await db.collection(COLLECTION).doc(sha256(key)).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (!cacheIsFresh(String(data.expiresAt || ""))) return null;
  return (data.value as T) ?? null;
}

async function writeCache<T>(key: string, value: T) {
  const { db } = initAdmin();
  const now = new Date().toISOString();
  await db.collection(COLLECTION).doc(sha256(key)).set({
    key: key.slice(0, 500),
    value,
    fetchedAt: now,
    expiresAt: cacheExpiresAt(),
  });
}

/** Return a saved result for 15 days. Identical in-flight calls share one fetch. */
export async function withCache<T>(key: string, load: () => Promise<T | null>): Promise<T | null> {
  const saved = await readCache<T>(key);
  if (saved != null) return saved;
  const running = pending.get(key) as Promise<T | null> | undefined;
  if (running) return running;
  const job = (async () => {
    const value = await load();
    if (value != null) await writeCache(key, value);
    return value;
  })().finally(() => {
    pending.delete(key);
  });
  pending.set(key, job);
  return job;
}
