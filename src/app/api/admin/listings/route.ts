import { NextRequest } from "next/server";
import { z } from "zod";
import { getBusiness } from "@/lib/data";
import { initAdmin } from "@/lib/firebase/admin";
import { historyActor, writeHistoryUnlessUnchanged } from "@/lib/history";
import { errorResponse, HttpError, json, requireAdmin } from "@/lib/http";
import { applyListingPatch, listingFieldsSchema, refreshListing } from "@/lib/listing-update";
import { publicSnapshot } from "@/lib/public-fields";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) throw new HttpError(400, "Missing listing id.");
    const business = await getBusiness(id);
    if (!business) throw new HttpError(404, "Listing not found.");
    return json({ business });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = z
      .object({
        id: z.string(),
        data: listingFieldsSchema.partial(),
      })
      .parse(await request.json());

    const current = await getBusiness(body.id);
    if (!current) throw new HttpError(404, "Listing not found.");

    const { next, stored } = await applyListingPatch(current, body.data, {
      allowIdentityChange: true,
      allowSlugChange: true,
    });

    const { db } = initAdmin();
    await db.collection("businesses").doc(current.id).set(stored, { merge: true });
    await writeHistoryUnlessUnchanged(
      "businesses",
      current.id,
      "update",
      publicSnapshot(current),
      publicSnapshot(next),
      historyActor(admin, "admin"),
    );
    await refreshListing(next, current.slug);
    return json({ business: next });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}
