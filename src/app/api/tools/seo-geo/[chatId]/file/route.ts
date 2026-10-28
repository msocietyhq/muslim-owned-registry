import { NextRequest } from "next/server";
import { getChatThread } from "@/lib/seo-geo/chat";
import { reportDocx, reportPdf } from "@/lib/seo-geo/office";
import { errorResponse, json, requireUser } from "@/lib/http";

type Context = { params: Promise<{ chatId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const { chatId } = await context.params;
    const thread = await getChatThread(user.uid, chatId);
    if (!thread?.chat.report) return json({ error: "Report not ready." }, 404);
    const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "docx";
    const file = format === "pdf" ? reportPdf(thread.chat.report) : reportDocx(thread.chat.report);
    const name = `${thread.chat.domain.replace(/[^a-z0-9.-]+/gi, "-")}-search-report.${format}`;
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
