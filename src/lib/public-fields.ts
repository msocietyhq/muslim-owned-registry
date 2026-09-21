const PRIVATE_KEYS = new Set([
  "uenStoragePath",
  "email",
  "loginEmail",
  "codeHash",
  "tokenHash",
]);

export function publicSnapshot(record: Record<string, unknown>) {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (PRIVATE_KEYS.has(key)) continue;
    copy[key] = value;
  }
  return copy;
}

export function listingShowsLoginEmail(html: string) {
  return /login email/i.test(html) && /@/.test(html);
}
