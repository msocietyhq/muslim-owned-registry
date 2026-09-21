import { NextRequest } from "next/server";
import { z } from "zod";
import { translateContent } from "@/lib/google-translate";
import { isLang } from "@/lib/i18n";
import { errorResponse, json } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({
        text: z.string().min(1).max(8000),
        lang: z.string(),
      })
      .parse(await request.json());
    if (!isLang(body.lang)) {
      return json({ text: body.text });
    }
    const text = await translateContent(body.text, body.lang);
    return json({ text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Nothing to translate." }, 400);
    }
    return errorResponse(error);
  }
}
