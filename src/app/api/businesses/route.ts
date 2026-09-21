import { randomUUID } from "crypto";
import { after, NextRequest } from "next/server";
import { z } from "zod";
import { addMonths } from "@/lib/crypto";
import {
  getBusiness,
  getBusinessesByOwner,
  getOwner,
  allocatePublishedSlug,
  toBusinessDoc,
} from "@/lib/data";
import { sendListingLiveMail, sendListingReceiptMail, sendListingRejectedMail } from "@/lib/email";
import { createOwnerListing } from "@/lib/create-owner-listing";
import { listingNeedsReview, ownerIdentityLocked } from "@/lib/listing-review";
import {
  applyListingPatch,
  listingCreateSchema,
  listingFieldsSchema,
  refreshListing,
} from "@/lib/listing-update";
import { initAdmin } from "@/lib/firebase/admin";
import { foundingFeaturedUntil, shouldStartFoundingFeature } from "@/lib/founding";
import { historyActor, writeHistory, writeHistoryUnlessUnchanged } from "@/lib/history";
import { errorResponse, HttpError, json, requireAdmin, requireUser } from "@/lib/http";
import { TERMS_CLAUSE_COUNT } from "@/lib/legal";
import { publicSnapshot } from "@/lib/public-fields";
import { getListingStatsMap } from "@/lib/listing-analytics";
import { brandSlugPrefix } from "@/lib/slug";
import { CONFIRMATION_MONTHS, type Business } from "@/lib/types";
import { listingDraftDocId } from "@/lib/listing-draft";

async function ownerActor(
  user: { uid: string; email?: string | null; name?: string | null },
) {
  const owner = await getOwner(user.uid);
  return historyActor(user, "owner", owner?.displayName);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const businesses = await getBusinessesByOwner(user.uid);
    const stats = await getListingStatsMap(businesses.map((business) => business.id));
    return json({ businesses, stats });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = listingCreateSchema.parse(await request.json());
    const created = await createOwnerListing({ user, body });
    after(() =>
      sendListingReceiptMail(created.receipt).catch((error) => {
        console.error("listing receipt mail", error);
      }),
    );
    await initAdmin()
      .db.collection("listingDrafts")
      .doc(listingDraftDocId(user.uid))
      .delete()
      .catch(() => undefined);
    return json({ business: created.stored, taskId: created.taskId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = z
      .object({
        id: z.string().uuid(),
        action: z.enum(["update", "unpublish", "reconfirm"]).default("update"),
        data: listingFieldsSchema.partial().optional(),
        acceptTerms: z.boolean().optional(),
        acceptedClauseCount: z.number().optional(),
        termsCopy: z.string().max(8000).optional(),
      })
      .parse(await request.json());

    const current = await getBusiness(body.id);
    if (!current) throw new HttpError(404, "Listing not found.");
    if (current.ownerId !== user.uid) throw new HttpError(403, "Not your listing.");

    const { db } = initAdmin();
    const now = new Date().toISOString();
    const actor = await ownerActor(user);

    if (body.action === "unpublish") {
      const next = { ...current, status: "unpublished" as const, updatedAt: now };
      await db.collection("businesses").doc(current.id).set(toBusinessDoc(next), { merge: true });
      await writeHistoryUnlessUnchanged(
        "businesses",
        current.id,
        "update",
        publicSnapshot(current),
        publicSnapshot(next),
        actor,
      );
      await refreshListing(next);
      return json({ business: next });
    }

    if (body.action === "reconfirm") {
      if (!["unpublished", "live", "pending_activation"].includes(current.status)) {
        throw new HttpError(400, "This listing cannot be reconfirmed yet.");
      }
      const next = {
        ...current,
        status: "live" as const,
        lastConfirmedAt: now,
        confirmationDueAt: addMonths(now, CONFIRMATION_MONTHS),
        lastReminderAt: null,
        updatedAt: now,
      };
      await db.collection("businesses").doc(current.id).set(toBusinessDoc(next), { merge: true });
      await writeHistoryUnlessUnchanged(
        "businesses",
        current.id,
        "update",
        publicSnapshot(current),
        publicSnapshot(next),
        actor,
      );
      await refreshListing(next);
      return json({ business: next });
    }

    const data = body.data;
    if (!data) throw new HttpError(400, "Missing fields.");
    if (ownerIdentityLocked(current.status) && listingNeedsReview(data, current)) {
      throw new HttpError(
        400,
        "The UEN and registered company name cannot be changed after the listing is approved.",
      );
    }

    const { next, stored } = await applyListingPatch(current, data, {
      allowIdentityChange: !ownerIdentityLocked(current.status),
    });
    const resubmit = current.status === "draft";
    if (resubmit) {
      if (next.uen.trim().length < 8 || next.registeredName.trim().length < 2) {
        throw new HttpError(400, "Add the UEN and registered company name before you submit.");
      }
      if (!current.termsAcceptedAt) {
        if (!body.acceptTerms || body.acceptedClauseCount !== TERMS_CLAUSE_COUNT) {
          throw new HttpError(400, "Please tick every sentence before you submit.");
        }
        next.termsAcceptedAt = now;
        stored.termsAcceptedAt = now;
      }
    }
    next.status = resubmit ? "pending_review" : current.status;
    next.lastAdminNote = resubmit ? null : current.lastAdminNote;

    await db.collection("businesses").doc(current.id).set(
      { ...stored, status: next.status, lastAdminNote: next.lastAdminNote, termsAcceptedAt: next.termsAcceptedAt },
      { merge: true },
    );
    await writeHistoryUnlessUnchanged(
      "businesses",
      current.id,
      "update",
      publicSnapshot(current),
      publicSnapshot(next),
      actor,
    );

    if (!resubmit) {
      await refreshListing(next, current.slug);
      return json({ business: next });
    }

    const taskId = randomUUID();
    await db.collection("adminTasks").doc(taskId).set({
      id: taskId,
      type: "listing_verification",
      status: "open",
      businessId: current.id,
      ownerId: user.uid,
      payload: publicSnapshot(next),
      uenStoragePath: stored.uenStoragePath ?? null,
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
    });

    return json({ business: next, taskId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = z
      .object({
        taskId: z.string(),
        action: z.enum(["accept", "reject", "remove"]),
        note: z.string().max(1500).optional().default(""),
      })
      .parse(await request.json());

    const { db } = initAdmin();
    const taskRef = db.collection("adminTasks").doc(body.taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) throw new HttpError(404, "Task not found.");
    const task = taskSnap.data()!;
    const business = await getBusiness(String(task.businessId || ""));
    if (!business) throw new HttpError(404, "Listing not found.");
    const now = new Date().toISOString();
    const actor = historyActor(admin, "admin");

    if (body.action === "remove") {
      const next = { ...business, status: "removed" as const, updatedAt: now };
      await db.collection("businesses").doc(business.id).set(toBusinessDoc(next), { merge: true });
      await writeHistoryUnlessUnchanged(
        "businesses",
        business.id,
        "update",
        publicSnapshot(business),
        publicSnapshot(next),
        actor,
      );
      await taskRef.set(
        {
          status: "done",
          resolvedAt: now,
          resolvedBy: admin.uid,
          resolutionNote: body.note || "Removed by admin.",
        },
        { merge: true },
      );
      await refreshListing(next);
      return json({ ok: true });
    }

    if (task.status !== "open") throw new HttpError(400, "This task is already closed.");

    if (body.action === "reject") {
      const note = body.note.trim();
      if (note.length < 10) {
        throw new HttpError(
          400,
          "Write a short comment so the owner knows what to fix before they submit again.",
        );
      }
      const next = {
        ...business,
        status: "draft" as const,
        lastAdminNote: note,
        updatedAt: now,
      };
      await db.collection("businesses").doc(business.id).set(toBusinessDoc(next), { merge: true });
      await writeHistoryUnlessUnchanged(
        "businesses",
        business.id,
        "update",
        publicSnapshot(business),
        publicSnapshot(next),
        actor,
      );
      await taskRef.set(
        {
          status: "rejected",
          resolvedAt: now,
          resolvedBy: admin.uid,
          resolutionNote: note,
        },
        { merge: true },
      );
      await sendListingRejectedMail({
        to: business.contactEmail,
        brandName: business.brandName,
        listingId: business.id,
        note,
      });
      await refreshListing(next);
      return json({ ok: true });
    }

    let slug = business.slug;
    try {
      slug = await allocatePublishedSlug(
        business.slug || brandSlugPrefix(business.brandName),
        business.id,
      );
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Could not allocate a page link.",
      );
    }
    const previousSlug = business.slug;
    const next = {
      ...business,
      slug,
      status: "live" as const,
      lastConfirmedAt: now,
      confirmationDueAt: addMonths(now, CONFIRMATION_MONTHS),
      lastReminderAt: null,
      updatedAt: now,
      featuredUntil: shouldStartFoundingFeature(business)
        ? foundingFeaturedUntil(now)
        : business.featuredUntil,
    };
    await db.collection("businesses").doc(business.id).set(toBusinessDoc(next), { merge: true });
    await writeHistoryUnlessUnchanged(
      "businesses",
      business.id,
      "update",
      publicSnapshot(business),
      publicSnapshot(next),
      actor,
    );

    const verSnap = await db
      .collection("verifications")
      .where("businessId", "==", business.id)
      .get();
    const openVer = verSnap.docs.sort((a, b) =>
      (b.get("createdAt") as string).localeCompare(a.get("createdAt") as string),
    )[0];
    if (openVer) {
      const verification = { ...openVer.data(), verifiedAt: now };
      await openVer.ref.set(verification, { merge: true });
      await writeHistory("verifications", openVer.id, "update", verification, actor);
    }

    await taskRef.set(
      {
        status: "done",
        resolvedAt: now,
        resolvedBy: admin.uid,
        resolutionNote: body.note || "Accepted.",
      },
      { merge: true },
    );

    await sendListingLiveMail({
      to: business.contactEmail,
      brandName: business.brandName,
      slug: next.slug,
    });
    await refreshListing(next, previousSlug);
    return json({ ok: true, business: next });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid admin action." }, 400);
    }
    return errorResponse(error);
  }
}
