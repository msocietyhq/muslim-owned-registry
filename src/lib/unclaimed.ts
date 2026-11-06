import { sqlClient } from "@/lib/db/client";
import { isDemoListing } from "@/lib/types";
import type { Business } from "@/lib/types";

const CACHE_MS = 30_000;
let accountCache: { at: number; ids: Set<string> } | null = null;

export function sortUnclaimedLast<T extends { unclaimed?: boolean }>(items: T[]): T[] {
  return [...items.filter((item) => !item.unclaimed), ...items.filter((item) => item.unclaimed)];
}

/** A short sample keeps claimed listings first and unclaimed listings at the end. */
export function sampleUnclaimedLast<T extends { unclaimed?: boolean }>(
  items: T[],
  count: number,
  pick: (pool: T[], take: number) => T[],
): T[] {
  if (count <= 0) return [];
  const claimed = items.filter((item) => !item.unclaimed);
  const unclaimed = items.filter((item) => item.unclaimed);
  if (!unclaimed.length) return pick(claimed, count);
  if (!claimed.length) return pick(unclaimed, count);
  const tailCount = Math.min(unclaimed.length, Math.max(1, Math.floor(count / 3)));
  const tail = pick(unclaimed, tailCount);
  const head = pick(claimed, Math.max(0, count - tail.length));
  return [...head, ...tail];
}

export function listingIsUnclaimed(
  business: { isDemo: boolean | null; ownerId: string },
  accountIds: Set<string>,
) {
  if (isDemoListing(business)) return false;
  const ownerId = business.ownerId?.trim() || "";
  if (!ownerId) return true;
  return !accountIds.has(ownerId);
}

export async function accountOwnerIds() {
  if (accountCache && Date.now() - accountCache.at < CACHE_MS) return accountCache.ids;
  const sql = await sqlClient();
  const rows = await sql.unsafe(
    `select id from "user" where email is not null and btrim(email) <> ''`,
  );
  const ids = new Set(rows.map((row) => String(row.id || "")).filter(Boolean));
  accountCache = { at: Date.now(), ids };
  return ids;
}

export async function accountEmail(ownerId: string) {
  const id = ownerId.trim();
  if (!id) return "";
  const sql = await sqlClient();
  const rows = await sql.unsafe(`select email from "user" where id = $1 limit 1`, [id]);
  const email = rows[0]?.email;
  return typeof email === "string" ? email.trim() : "";
}

export async function annotateUnclaimed(rows: Business[]): Promise<Business[]> {
  if (!rows.length) return rows;
  let ids: Set<string> | null = null;
  try {
    ids = await accountOwnerIds();
  } catch (error) {
    console.error("accountOwnerIds", error);
  }
  if (!ids) return rows.map((row) => ({ ...row, unclaimed: false }));
  return rows.map((row) => ({ ...row, unclaimed: listingIsUnclaimed(row, ids) }));
}
