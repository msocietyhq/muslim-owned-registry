import { NextRequest } from "next/server";
import { getAllBusinesses, getBusinessesByOwner } from "@/lib/data";
import { actorIsAdmin, errorResponse, json, requireUser } from "@/lib/http";
import { annotateUnclaimed } from "@/lib/unclaimed";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const isAdmin = await actorIsAdmin(user);
    const status = request.nextUrl.searchParams.get("status") || "";
    const rows = isAdmin ? await getAllBusinesses() : await getBusinessesByOwner(user.uid);
    const annotated = await annotateUnclaimed(rows);
    const listings = status ? annotated.filter((item) => item.status === status) : annotated;
    return json({ listings });
  } catch (error) {
    return errorResponse(error);
  }
}
