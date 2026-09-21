import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, json } from "@/lib/http";
import { completeListingFromSources, suggestTagsForDraft } from "@/lib/listing-ai-run";
import { LISTING_AI_NEED_SOURCE } from "@/lib/listing-ai";
import { parsePhotos } from "@/lib/photos";

export async function POST(request: NextRequest) {
  try {
    const body = z
      .object({
        website: z.string().max(500).optional().nullable(),
        photos: z.array(z.string().max(2000)).max(5).optional().default([]),
      })
      .parse(await request.json());
    const photos = parsePhotos(body.photos);
    const website = body.website?.trim() || "";
    if (!website && !photos.length) {
      throw new HttpError(400, LISTING_AI_NEED_SOURCE);
    }
    const draft = await completeListingFromSources({ website, photos });
    const tagIds = await suggestTagsForDraft(draft);
    return json({ draft, tagIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Check the website or photos and try again." }, 400);
    }
    if (error instanceof HttpError) return errorResponse(error);
    if (error instanceof Error) {
      return json({ error: error.message }, 400);
    }
    return errorResponse(error);
  }
}
