import { NextRequest } from "next/server";
import { getBusiness } from "@/lib/data";
import { actorIsAdmin, errorResponse, HttpError, json, requireUser } from "@/lib/http";
import { annotateUnclaimed } from "@/lib/unclaimed";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const business = await getBusiness(id);
    if (!business) throw new HttpError(404, "Listing not found.");
    const isAdmin = await actorIsAdmin(user);
    if (!isAdmin && business.ownerId !== user.uid) {
      throw new HttpError(403, "Not your listing.");
    }
    const [listing] = await annotateUnclaimed([business]);
    return json({ listing: listing || business });
  } catch (error) {
    return errorResponse(error);
  }
}
