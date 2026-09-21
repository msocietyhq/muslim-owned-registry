import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function isWithinOneYear(isoDate: string, now = new Date()): boolean {
  const downloaded = new Date(isoDate);
  if (Number.isNaN(downloaded.getTime())) return false;
  const ageMs = now.getTime() - downloaded.getTime();
  const year = 365 * 24 * 60 * 60 * 1000;
  const tzSlop = 24 * 60 * 60 * 1000;
  return ageMs <= year && ageMs >= -tzSlop;
}
