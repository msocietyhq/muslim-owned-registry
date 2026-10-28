import { NextRequest } from "next/server";
import { startQuestions } from "@/lib/seo-geo/chat";
import { processSeoGeoQueue } from "@/lib/seo-geo/queue";
import { errorResponse, json, requireUser } from "@/lib/http";
import { after } from "next/server";

type Context = { params: Promise<{ chatId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const { chatId } = await context.params;
    const result = await startQuestions(user.uid, chatId);
    if (!result.ok) return json({ error: result.error }, result.status);
    after(() => processSeoGeoQueue());
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
