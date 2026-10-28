import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { listingOwnerChallengeExpiresAt, randomToken, sha256, hashesEqual } from "@/lib/crypto";
import { sendFeedbackConfirmMail, sendFeedbackReceivedMail } from "@/lib/email";
import {
  FEEDBACK_CHALLENGES,
  FEEDBACK_MESSAGES,
  feedbackStartSchema,
  feedbackVerifyUrl,
} from "@/lib/feedback";
import { adminEmails } from "@/lib/admin-env";
import { issueLoginMagicLink } from "@/lib/login-challenge";
import { initAdmin } from "@/lib/firebase/admin";
import { errorResponse, HttpError, json, siteUrl } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const body = feedbackStartSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const token = randomToken();
    const now = new Date().toISOString();
    const { db } = initAdmin();
    await db.collection(FEEDBACK_CHALLENGES).doc(email).set({
      email,
      tokenHash: sha256(token),
      message: body.message.trim(),
      prompt: (body.prompt || "").trim(),
      expiresAt: listingOwnerChallengeExpiresAt(now),
      createdAt: now,
    });
    const confirmUrl = feedbackVerifyUrl({ siteUrl: siteUrl(), email, token });
    await sendFeedbackConfirmMail({ to: email, confirmUrl });
    return json({
      ok: true,
      email,
      devConfirmUrl: process.env.ALLOW_DEV_OTP === "true" ? confirmUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = z
      .object({
        email: z.string().email(),
        token: z.string().min(16),
      })
      .parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const { db } = initAdmin();
    const challenge = await db.collection(FEEDBACK_CHALLENGES).doc(email).get();
    if (!challenge.exists) throw new HttpError(400, "This confirmation is no longer valid. Send the form again.");
    const data = challenge.data()!;
    if (new Date(String(data.expiresAt)).getTime() < Date.now()) {
      throw new HttpError(400, "This confirmation has expired. Send the form again.");
    }
    if (!hashesEqual(String(data.tokenHash), sha256(body.token))) {
      throw new HttpError(400, "This confirmation link is not valid.");
    }

    const message = String(data.message || "").trim();
    const prompt = String(data.prompt || "").trim();
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.collection(FEEDBACK_MESSAGES).doc(id).set({
      id,
      email,
      message,
      prompt,
      createdAt: now,
    });
    await db.collection("adminTasks").doc(id).set({
      id,
      type: "site_feedback",
      status: "open",
      businessId: "",
      ownerId: "",
      payload: { email, message, prompt, fromEmail: email },
      uenStoragePath: null,
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null,
    });
    await db.collection(FEEDBACK_CHALLENGES).doc(email).delete();

    for (const mailbox of adminEmails()) {
      try {
        const { magicUrl } = await issueLoginMagicLink({
          email: mailbox,
          nextPath: "/admin",
          kind: "admin-task",
        });
        await sendFeedbackReceivedMail({
          to: mailbox,
          fromEmail: email,
          message,
          prompt: prompt || undefined,
          openUrl: magicUrl,
        });
      } catch (error) {
        console.error("feedback admin mail", mailbox, error);
      }
    }

    return json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "This confirmation link is missing details." }, 400);
    }
    return errorResponse(error);
  }
}
