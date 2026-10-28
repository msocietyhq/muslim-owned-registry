import { after, NextRequest } from "next/server";
import { submitAnswers } from "@/lib/seo-geo/chat";
import type { SeoAnswer } from "@/lib/seo-geo/flow";
import { processSeoGeoQueue } from "@/lib/seo-geo/queue";
import { errorResponse, json, requireUser } from "@/lib/http";

type Context = { params: Promise<{ chatId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const { chatId } = await context.params;
    const body = (await request.json()) as { answers?: SeoAnswer[] };
    const result = await submitAnswers(user.uid, chatId, Array.isArray(body.answers) ? body.answers : []);
    if (!result.ok) return json({ error: result.error }, result.status);
    after(() => processSeoGeoQueue());
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
