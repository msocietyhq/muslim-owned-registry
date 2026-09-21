import { getAuth } from "@/lib/auth";
import { hasDatabase } from "@/lib/db/client";

async function handler(request: Request) {
  if (!hasDatabase()) {
    return Response.json({ error: "Database is not configured." }, { status: 503 });
  }
  return getAuth().handler(request);
}

export const GET = handler;
export const POST = handler;
