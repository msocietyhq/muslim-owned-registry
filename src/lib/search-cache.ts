import { sha256 } from "@/lib/crypto";
import { initAdmin } from "@/lib/firebase/admin";

export const SEARCH_CACHE_DAYS = 7;
const COLLECTION = "search_cache";
const pending = new Map<string, Promise<unknown>>();

export function searchCacheKey(intent: string) {
  return intent.trim().toLowerCase().replace(/\s+/g, " ");
}

function expiresAt(now = Date.now()) {
  return new Date(now + SEARCH_CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isFresh(value: string, now = Date.now()) {
  const at = Date.parse(value);
  return !Number.isNaN(at) && at > now;
}

export async function readSearchCache<T>(intent: string): Promise<T | null> {
  try {
    const key = searchCacheKey(intent);
    if (!key) return null;
    const { db } = initAdmin();
    const snap = await db.collection(COLLECTION).doc(sha256(key)).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (!isFresh(String(data.expiresAt || ""))) return null;
    return (data.value as T) ?? null;
  } catch (error) {
    console.error("search cache read", error);
    return null;
  }
}

export async function writeSearchCache<T>(intent: string, value: T) {
  try {
    const key = searchCacheKey(intent);
    if (!key) return;
    const { db } = initAdmin();
    const now = new Date().toISOString();
    await db.collection(COLLECTION).doc(sha256(key)).set({
      key: key.slice(0, 400),
      value,
      savedAt: now,
      expiresAt: expiresAt(),
    });
  } catch (error) {
    console.error("search cache write", error);
  }
}

/** Identical sentences share one lookup, including calls already in flight. */
export async function withSearchCache<T>(
  intent: string,
  load: () => Promise<T>,
  save: (value: T) => boolean = () => true,
): Promise<T> {
  const saved = await readSearchCache<T>(intent);
  if (saved != null) return saved;
  const key = searchCacheKey(intent);
  const running = pending.get(key) as Promise<T> | undefined;
  if (running) return running;
  const job = (async () => {
    const value = await load();
    if (save(value)) await writeSearchCache(intent, value);
    return value;
  })().finally(() => {
    pending.delete(key);
  });
  pending.set(key, job);
  return job;
}
