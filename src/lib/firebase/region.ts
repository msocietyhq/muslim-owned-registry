/**
 * Singapore-only Google Cloud / Firebase locations.
 *
 * Use the **regional** id `asia-southeast1`, never `us-central1` and never the
 * `ASIA` multi-region (that replicates outside Singapore).
 *
 * Firebase Auth user records are global — Google does not offer a region pin.
 */
export const FIREBASE_REGION = "asia-southeast1" as const;
export const FIREBASE_TIMEZONE = "Asia/Singapore" as const;
