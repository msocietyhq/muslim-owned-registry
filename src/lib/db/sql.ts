import { readFileSync } from "node:fs";
import path from "node:path";

export function schemaSql() {
  return readFileSync(path.join(process.cwd(), "drizzle/0000_init.sql"), "utf8");
}

export function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:--[^\n]*)?\n/)
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("--"));
}
