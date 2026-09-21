import { NextRequest } from "next/server";
import { z } from "zod";
import { initAdmin } from "@/lib/firebase/admin";
import { errorResponse, json, requireUser } from "@/lib/http";
import {
  isListingDraftEmpty,
  listingDraftDocId,
  listingDraftFieldsSchema,
  parseListingDraft,
} from "@/lib/listing-draft";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { db } = initAdmin();
    const snap = await db.collection("listingDrafts").doc(listingDraftDocId(user.uid)).get();
    if (!snap.exists) return json({ draft: null });
    return json({ draft: parseListingDraft(snap.data()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const fields = listingDraftFieldsSchema.parse(await request.json());
    const { db } = initAdmin();
    const ref = db.collection("listingDrafts").doc(listingDraftDocId(user.uid));
    if (isListingDraftEmpty(fields)) {
      await ref.delete();
      return json({ draft: null });
    }
    const draft = {
      ...fields,
      ownerId: user.uid,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(draft);
    return json({ draft: parseListingDraft(draft) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Could not save the draft." }, 400);
    }
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { db } = initAdmin();
    await db.collection("listingDrafts").doc(listingDraftDocId(user.uid)).delete();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
