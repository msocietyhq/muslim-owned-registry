import { after, NextRequest } from "next/server";
import { z } from "zod";
import { sixDigitCode, randomToken, sha256, hashesEqual, listingOwnerChallengeExpiresAt } from "@/lib/crypto";
import { createOwnerListing } from "@/lib/create-owner-listing";
import { sendListQuickMail, sendListingReceiptMail } from "@/lib/email";
import { createPasswordlessSession } from "@/lib/auth";
import { getOrCreateOwnerAccount } from "@/lib/ensure-owner";
import { initAdmin } from "@/lib/firebase/admin";
import { errorResponse, HttpError, json, siteUrl } from "@/lib/http";
import { listingCreateSchema } from "@/lib/listing-update";
import {
  LIST_QUICK_CHALLENGES,
  LIST_QUICK_PENDING,
  isListQuickUenPath,
  listQuickMagicUrl,
  listQuickStartSchema,
} from "@/lib/list-quick";

export async function POST(request: NextRequest) {
  try {
    const body = listQuickStartSchema.parse(await request.json());
    const loginEmail = body.loginEmail.trim().toLowerCase();
    if (body.verificationType === "uen_document") {
      if (!body.uenStoragePath || !isListQuickUenPath(body.uenStoragePath, body.guestId)) {
        throw new HttpError(400, "Upload the UEN document.");
      }
    }

    const { db } = initAdmin();
    const pendingId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { loginEmail: _ignored, guestId, ...listing } = body;
    await db.collection(LIST_QUICK_PENDING).doc(pendingId).set({
      id: pendingId,
      email: loginEmail,
      guestId,
      listing,
      createdAt: now,
    });

    const code = sixDigitCode();
    const token = randomToken();
    const expiresAt = listingOwnerChallengeExpiresAt(now);
    await db.collection(LIST_QUICK_CHALLENGES).doc(loginEmail).set({
      email: loginEmail,
      pendingId,
      codeHash: sha256(code),
      tokenHash: sha256(token),
      expiresAt,
      createdAt: now,
    });

    const magicUrl = listQuickMagicUrl({ siteUrl: siteUrl(), email: loginEmail, token });
    await sendListQuickMail({
      to: loginEmail,
      code,
      magicUrl,
      brandName: listing.brandName,
    });

    return json({
      ok: true,
      email: loginEmail,
      pendingId,
      devCode: process.env.ALLOW_DEV_OTP === "true" ? code : undefined,
      devMagicUrl: process.env.ALLOW_DEV_OTP === "true" ? magicUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form and your sign-in email." }, 400);
    }
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = z
      .object({
        email: z.string().email(),
        code: z.string().optional(),
        token: z.string().optional(),
      })
      .parse(await request.json());
    if (!body.code && !body.token) {
      throw new HttpError(400, "Enter the code or use the link in your email.");
    }

    const email = body.email.trim().toLowerCase();
    const { db } = initAdmin();
    const challenge = await db.collection(LIST_QUICK_CHALLENGES).doc(email).get();
    if (!challenge.exists) throw new HttpError(400, "Request a new code from the listing form.");
    const data = challenge.data()!;
    if (new Date(String(data.expiresAt)).getTime() < Date.now()) {
      throw new HttpError(400, "That code expired. Submit the form again.");
    }
    const ok = body.code
      ? hashesEqual(String(data.codeHash), sha256(body.code.trim()))
      : hashesEqual(String(data.tokenHash), sha256(body.token!));
    if (!ok) throw new HttpError(400, "That code or link is not valid.");

    const pendingId = String(data.pendingId || "");
    const pendingSnap = await db.collection(LIST_QUICK_PENDING).doc(pendingId).get();
    if (!pendingSnap.exists) throw new HttpError(400, "That listing form expired. Fill it in again.");
    const pending = pendingSnap.data()!;
    if (String(pending.email || "") !== email) {
      throw new HttpError(400, "That code does not match this listing.");
    }

    const listing = listingCreateSchema.parse(pending.listing);
    const owner = await getOrCreateOwnerAccount(email);
    const created = await createOwnerListing({
      user: { uid: owner.uid, email: owner.email },
      body: listing,
    });

    await db.collection(LIST_QUICK_CHALLENGES).doc(email).delete();
    await db.collection(LIST_QUICK_PENDING).doc(pendingId).delete();
    await createPasswordlessSession(email, request.headers);

    after(() =>
      sendListingReceiptMail(created.receipt).catch((error) => {
        console.error("listing receipt mail", error);
      }),
    );

    return json({
      ok: true,
      uid: owner.uid,
      isAdmin: owner.isAdmin,
      businessId: created.stored.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Check the code and try again." }, 400);
    }
    return errorResponse(error);
  }
}
