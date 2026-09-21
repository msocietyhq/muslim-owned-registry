import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { schemaSql } from "./sql";

type AppDb = PostgresJsDatabase<typeof schema>;

declare global {
  var __MOSG_DB__: AppDb | undefined;
  var __MOSG_SQL__: SqlLike | undefined;
}

export type TxSql = {
  unsafe(query: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
};

export type SqlLike = TxSql & {
  begin<T>(fn: (tx: TxSql) => Promise<T>): Promise<T>;
};

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL) || process.env.USE_PGLITE === "1";
}

function wrapPostgres(sql: ReturnType<typeof postgres>): SqlLike {
  return {
    unsafe: (query, params = []) => sql.unsafe(query, params as never[]) as Promise<Record<string, unknown>[]>,
    begin: (fn) =>
      sql.begin((tx) =>
        fn({
          unsafe: (query, params = []) => tx.unsafe(query, params as never[]) as Promise<Record<string, unknown>[]>,
        }),
      ) as Promise<never>,
  };
}

export async function sqlClient(): Promise<SqlLike> {
  if (globalThis.__MOSG_SQL__) return globalThis.__MOSG_SQL__;
  if (process.env.USE_PGLITE === "1") {
    const { PGlite } = await import("@electric-sql/pglite");
    const client = new PGlite();
    await client.exec(schemaSql());
    const adapter: SqlLike = {
      async unsafe(query, params = []) {
        const result = await client.query(query, params);
        return result.rows as Record<string, unknown>[];
      },
      async begin(fn) {
        await client.query("BEGIN");
        try {
          const value = await fn(adapter);
          await client.query("COMMIT");
          return value;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      },
    };
    const { drizzle: drizzlePg } = await import("drizzle-orm/pglite");
    globalThis.__MOSG_DB__ = drizzlePg(client, { schema }) as unknown as AppDb;
    globalThis.__MOSG_SQL__ = adapter;
    return adapter;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 8, ssl: "require", prepare: false });
  globalThis.__MOSG_SQL__ = wrapPostgres(sql);
  globalThis.__MOSG_DB__ = drizzle(sql, { schema });
  return globalThis.__MOSG_SQL__;
}

export async function getDb(): Promise<AppDb> {
  if (globalThis.__MOSG_DB__) return globalThis.__MOSG_DB__;
  await sqlClient();
  return globalThis.__MOSG_DB__!;
}

export function getDbSync(): AppDb {
  if (globalThis.__MOSG_DB__) return globalThis.__MOSG_DB__;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 8, ssl: "require", prepare: false });
  globalThis.__MOSG_SQL__ = wrapPostgres(sql);
  globalThis.__MOSG_DB__ = drizzle(sql, { schema });
  return globalThis.__MOSG_DB__;
}
