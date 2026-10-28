/**
 * Railway Cron service start command:
 *   npx tsx scripts/run-seo-geo-queue.ts
 *
 * Schedule: * * * * * (every minute). Needs DATABASE_URL + JOBS_SECRET + DEEPSEEK_API_KEY.
 * Only one job runs at a time. Extra cron ticks skip if a job is already running.
 */
import { processSeoGeoQueue } from "../src/lib/seo-geo/queue";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.JOBS_SECRET) {
    throw new Error("JOBS_SECRET is required in production.");
  }
  const result = await processSeoGeoQueue();
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
