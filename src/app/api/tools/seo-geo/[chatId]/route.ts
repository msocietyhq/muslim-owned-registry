import { after, NextRequest } from "next/server";
import { sendChatMessage, threadPayload } from "@/lib/seo-geo/chat";
import { processSeoGeoQueue } from "@/lib/seo-geo/queue";
import { errorResponse, json, requireUser } from "@/lib/http";

export const maxDuration = 800;

type Context = { params: Promise<{ chatId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const { chatId } = await context.params;
    const thread = await threadPayload(user.uid, chatId);
    if (!thread) return json({ error: "Chat not found." }, 404);
    return json(thread);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const { chatId } = await context.params;
    const body = (await request.json()) as { message?: string };
    const result = await sendChatMessage(user.uid, chatId, body.message || "", user.email);
    if (!result.ok) {
      return json(
        { error: result.error, remaining: result.remaining, queuePosition: result.queuePosition },
        result.status,
      );
    }
    after(() => processSeoGeoQueue());
    return json({
      queued: true,
      message: result.message,
      remaining: result.remaining,
      queuePosition: result.queuePosition,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
