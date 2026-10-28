import { listingOwnerChallengeExpiresAt, randomToken, sha256, sixDigitCode } from "@/lib/crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { siteUrl } from "@/lib/http";

export async function issueLoginMagicLink(params: {
  email: string;
  nextPath: string;
  kind: string;
}) {
  const email = params.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const token = randomToken();
  const code = sixDigitCode();
  const { db } = initAdmin();
  await db.collection("loginChallenges").doc(email).set({
    email,
    codeHash: sha256(code),
    tokenHash: sha256(token),
    nextPath: params.nextPath,
    kind: params.kind,
    expiresAt: listingOwnerChallengeExpiresAt(now),
    createdAt: now,
  });
  const magicUrl = `${siteUrl()}/login/verify?email=${encodeURIComponent(email)}&token=${token}&next=${encodeURIComponent(params.nextPath)}`;
  return { magicUrl, code };
}
