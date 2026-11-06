import { sqlClient } from "@/lib/db/client";
import { isDemoListing } from "@/lib/types";
import type { Business } from "@/lib/types";

const CACHE_MS = 30_000;
let accountCache: { at: number; ids: Set<string> } | null = null;

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
