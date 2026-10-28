/** Owner chat messages allowed per rolling hour when caps are on. */
export const SEO_GEO_MESSAGES_PER_HOUR = 15;

export const SEO_GEO_HOUR_MS = 60 * 60 * 1000;

export const SEO_GEO_MODEL = "deepseek-v4-pro";

/** Turn this back on after testing. afiq980@gmail.com stays unlimited either way. */
export const SEO_GEO_ENFORCE_CAPS = false;

export const SEO_GEO_UNLIMITED_EMAILS = ["afiq980@gmail.com"];

/** Backstop so one check cannot loop for dozens of model calls. */
export const SEO_GEO_RUNAWAY_ROUNDS = 16;

export function seoGeoUnlimited(email?: string | null) {
  const value = (email || "").trim().toLowerCase();
  return SEO_GEO_UNLIMITED_EMAILS.includes(value);
}

export function seoGeoCapsOff(email?: string | null) {
  return !SEO_GEO_ENFORCE_CAPS || seoGeoUnlimited(email);
}

export function seoGeoAgentRounds(email?: string | null) {
  return seoGeoCapsOff(email) ? SEO_GEO_RUNAWAY_ROUNDS : 8;
}

export function seoGeoMessageMax(email?: string | null) {
  return seoGeoCapsOff(email) ? Number.POSITIVE_INFINITY : 4000;
}

export function recentMessageTimes(timestamps: string[], now = Date.now()) {
  return timestamps.filter((value) => {
    const at = Date.parse(value);
    return !Number.isNaN(at) && now - at < SEO_GEO_HOUR_MS;
  });
}

export function messagesRemaining(timestamps: string[], now = Date.now()) {
  return Math.max(0, SEO_GEO_MESSAGES_PER_HOUR - recentMessageTimes(timestamps, now).length);
}
