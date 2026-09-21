import { NextRequest } from "next/server";
import { addMonths } from "@/lib/crypto";
import { getBusiness, toBusinessDoc } from "@/lib/data";
import { sendListingLiveMail } from "@/lib/email";
import { initAdmin } from "@/lib/firebase/admin";
import { LISTING_LINK_ACTOR, writeHistoryUnlessUnchanged } from "@/lib/history";
import { errorResponse, HttpError, json } from "@/lib/http";
import { readManageLink } from "@/lib/listing-link";
import { storeListingPhotos } from "@/lib/listing-photos";
import { DESCRIPTION_MAX, sanitizeMarkdown } from "@/lib/markdown";
import { parsePhotos } from "@/lib/photos";
import { publicSnapshot } from "@/lib/public-fields";
import { revalidatePublicListing } from "@/lib/cache";
import { CONFIRMATION_MONTHS, type Business } from "@/lib/types";

function ownerView(business: Business) {
  return {
    id: business.id,
    brandName: business.brandName,
    slug: business.slug,
    status: business.status,
    summary: business.summary,
    description: business.description,
    photos: business.photos,
    contactEmail: business.contactEmail,
  };
}

async function businessFromToken(token: string) {
  const link = await readManageLink(token);
  if (!link) throw new HttpError(404, "This link has expired.");
  const business = await getBusiness(link.businessId);
  if (!business) throw new HttpError(404, "Listing not found.");
  return business;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    const business = await businessFromToken(token);
    return json({ business: ownerView(business) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let token = "";
    let action = "update";
    let summary: string | undefined;
    let description: string | undefined;
    let photos: string[] | undefined;
    const files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      token = String(form.get("token") || "");
      action = String(form.get("action") || "update");
      if (form.has("summary")) summary = String(form.get("summary") || "");
      if (form.has("description")) description = String(form.get("description") || "");
      if (form.has("photos")) {
        try {
          photos = JSON.parse(String(form.get("photos") || "[]")) as string[];
        } catch {
          photos = [];
        }
      }
      for (const item of form.getAll("photoFiles")) {
        if (item instanceof File && item.size) files.push(item);
      }
    } else {
      const body = (await request.json()) as {
        token?: string;
        action?: string;
        summary?: string;
        description?: string;
        photos?: string[];
      };
      token = body.token || "";
      action = body.action || "update";
      summary = body.summary;
      description = body.description;
      photos = body.photos;
    }

    if (!["activate", "confirm", "update"].includes(action)) {
      throw new HttpError(400, "Unknown action.");
    }

    const current = await businessFromToken(token);
    const now = new Date().toISOString();
    const uploaded = files.length ? await storeListingPhotos(current.ownerId, files) : [];
    const mergedPhotos = parsePhotos([...(photos ?? current.photos), ...uploaded]);

    let next: Business = {
      ...current,
      summary: summary !== undefined ? summary.trim().slice(0, 280) : current.summary,
      description:
        description !== undefined
          ? sanitizeMarkdown(description).slice(0, DESCRIPTION_MAX)
          : current.description,
      photos: mergedPhotos,
      updatedAt: now,
    };

    if (action === "activate") {
      if (!["pending_activation", "unpublished"].includes(current.status)) {
        throw new HttpError(400, "This listing cannot be activated with this link.");
      }
      next = {
        ...next,
        status: "live",
        lastConfirmedAt: now,
        confirmationDueAt: addMonths(now, CONFIRMATION_MONTHS),
        lastReminderAt: null,
      };
    } else if (action === "confirm") {
      if (!["live", "unpublished", "pending_activation"].includes(current.status)) {
        throw new HttpError(400, "This listing cannot be confirmed with this link.");
      }
      next = {
        ...next,
        status: "live",
        lastConfirmedAt: now,
        confirmationDueAt: addMonths(now, CONFIRMATION_MONTHS),
        lastReminderAt: null,
      };
    }

    const { db } = initAdmin();
    await db.collection("businesses").doc(current.id).set(toBusinessDoc(next), { merge: true });
    await writeHistoryUnlessUnchanged(
      "businesses",
      current.id,
      "update",
      publicSnapshot(current),
      publicSnapshot(next),
      LISTING_LINK_ACTOR,
    );
    revalidatePublicListing(next.slug);

    if (action === "activate" && current.status !== "live") {
      await sendListingLiveMail({
        to: next.contactEmail,
        brandName: next.brandName,
        slug: next.slug,
      });
    }

    return json({ business: ownerView(next) });
  } catch (error) {
    return errorResponse(error);
  }
}
