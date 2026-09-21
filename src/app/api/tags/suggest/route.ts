import { NextRequest } from "next/server";
import { z } from "zod";
import { getTags } from "@/lib/data";
import { errorResponse, json, requireUser } from "@/lib/http";
import { suggestTagIds } from "@/lib/suggest-tags";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = z
      .object({
        brandName: z.string().max(120).optional().default(""),
        summary: z.string().max(280).optional().default(""),
        description: z.string().max(8000).optional().default(""),
      })
      .parse(await request.json());
    const text = `${body.brandName} ${body.summary} ${body.description}`.trim();
    if (text.length < 3) return json({ tagIds: [] });
    const tags = await getTags();
    const tagIds = await suggestTagIds({ ...body, tags });
    return json({ tagIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Add a brand name or a short description first." }, 400);
    }
    return errorResponse(error);
  }
}
