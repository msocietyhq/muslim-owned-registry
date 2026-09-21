/**
 * Railway Cron service start command:
 *   npx tsx scripts/run-confirmations.ts
 *
 * Schedule: 0 9 * * * (09:00 UTC). Needs DATABASE_URL + JOBS_SECRET on that service.
 */
import { runConfirmations } from "../src/lib/jobs/confirmations";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.JOBS_SECRET) {
    throw new Error("JOBS_SECRET is required in production.");
  }
  const result = await runConfirmations();
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
