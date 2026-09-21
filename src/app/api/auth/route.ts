import { NextRequest } from "next/server";
import { z } from "zod";
import { sixDigitCode, randomToken, sha256, hashesEqual, SIGN_IN_CHALLENGE_MS } from "@/lib/crypto";
import { createPasswordlessSession } from "@/lib/auth";
import { getOrCreateOwnerAccount } from "@/lib/ensure-owner";
import { keepLoginNextPath, safeAppPath } from "@/lib/app-path";
import { sendLoginMail } from "@/lib/email";
import { initAdmin } from "@/lib/firebase/admin";
import { errorResponse, HttpError, json, siteUrl } from "@/lib/http";

const emailSchema = z.object({
  email: z.string().email(),
  next: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = emailSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const { db } = initAdmin();
    const existing = await db.collection("loginChallenges").doc(email).get();
    const nextPath = keepLoginNextPath(existing.data(), body.next);
    const code = sixDigitCode();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + SIGN_IN_CHALLENGE_MS).toISOString();

    await db.collection("loginChallenges").doc(email).set({
      email,
      codeHash: sha256(code),
      tokenHash: sha256(token),
      expiresAt,
      createdAt: new Date().toISOString(),
      ...(nextPath ? { nextPath } : {}),
    });

    const magicUrl = `${siteUrl()}/login/verify?email=${encodeURIComponent(email)}&token=${token}${
      nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""
    }`;
    await sendLoginMail({ to: email, code, magicUrl });

    return json({
      ok: true,
      devCode: process.env.ALLOW_DEV_OTP === "true" ? code : undefined,
      devMagicUrl: process.env.ALLOW_DEV_OTP === "true" ? magicUrl : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Enter a valid email address." }, 400);
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
      throw new HttpError(400, "Enter the code or use the sign-in link.");
    }

    const email = body.email.trim().toLowerCase();
    const { db } = initAdmin();
    const challenge = await db.collection("loginChallenges").doc(email).get();
    if (!challenge.exists) throw new HttpError(400, "Request a new code.");
    const data = challenge.data()!;
    if (new Date(String(data.expiresAt)).getTime() < Date.now()) {
      throw new HttpError(400, "That code expired. Request a new one.");
    }

    const ok = body.code
      ? hashesEqual(String(data.codeHash), sha256(body.code.trim()))
      : hashesEqual(String(data.tokenHash), sha256(body.token!));
    if (!ok) throw new HttpError(400, "That code or link is not valid.");

    const owner = await getOrCreateOwnerAccount(email);
    await createPasswordlessSession(email, request.headers);
    await db.collection("loginChallenges").doc(email).delete();
    const next = safeAppPath(typeof data.nextPath === "string" ? data.nextPath : undefined);

    return json({
      ok: true,
      uid: owner.uid,
      isAdmin: owner.isAdmin,
      next,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Check the sign-in details and try again." }, 400);
    }
    return errorResponse(error);
  }
}
