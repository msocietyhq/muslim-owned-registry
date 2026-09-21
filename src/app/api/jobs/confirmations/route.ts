import { NextRequest } from "next/server";
import { runConfirmations } from "@/lib/jobs/confirmations";
import { errorResponse, json } from "@/lib/http";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: NextRequest) {
  try {
    const secret = runtimeEnv("JOBS_SECRET");
    if (secret) {
      const header = request.headers.get("x-job-secret");
      const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (header !== secret && bearer !== secret) {
        return json({ error: "Unauthorized." }, 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      return json({ error: "JOBS_SECRET is required in production." }, 500);
    }
    const result = await runConfirmations();
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
