import { NextRequest } from "next/server";
import { getBusinessesBySlugs } from "@/lib/data";
import { errorResponse, json } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const slugs = (request.nextUrl.searchParams.get("slugs") || "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, 50);
    const businesses = await getBusinessesBySlugs(slugs);
    return json({ businesses });
  } catch (error) {
    return errorResponse(error);
  }
}
