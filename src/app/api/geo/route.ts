import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, json, requireUser } from "@/lib/http";
import { searchSingaporePlaces } from "@/lib/nominatim";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const query = z
      .string()
      .trim()
      .min(3)
      .max(80)
      .parse(request.nextUrl.searchParams.get("q") || "");
    const results = await searchSingaporePlaces(query);
    return json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Type at least three characters to search the map." }, 400);
    }
    return errorResponse(error);
  }
}
