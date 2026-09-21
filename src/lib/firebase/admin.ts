import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { firestoreStore } from "@/lib/db/documents";
import { getBucket } from "@/lib/db/files";
import { user as userTable } from "@/lib/db/schema";

export { adminEmails, isAdminEmail } from "@/lib/admin-env";

class AuthNotFoundError extends Error {
  code = "auth/user-not-found";
}

export function getProjectId() {
  return process.env.NEON_PROJECT_ID || "little-scene-49442607";
}

function authApi() {
  return {
    async getUserByEmail(email: string) {
      const db = await getDb();
      const [row] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email.trim().toLowerCase()))
        .limit(1);
      if (!row) throw new AuthNotFoundError("auth/user-not-found");
      return { uid: row.id, email: row.email, emailVerified: row.emailVerified };
    },
    async createUser(input: { email: string; emailVerified?: boolean }) {
      const db = await getDb();
      const id = randomUUID();
      const now = new Date();
      const email = input.email.trim().toLowerCase();
      await db.insert(userTable).values({
        id,
        name: email.split("@")[0] || "owner",
        email,
        emailVerified: Boolean(input.emailVerified),
        createdAt: now,
        updatedAt: now,
      });
      return { uid: id, email, emailVerified: Boolean(input.emailVerified) };
    },
    async updateUser() {
      return undefined;
    },
    async setCustomUserClaims(_uid?: string, _claims?: Record<string, unknown>) {
      return undefined;
    },
    async createCustomToken(uid: string) {
      return uid;
    },
    async verifyIdToken() {
      throw new Error("Use cookie sessions.");
    },
  };
}

export function initAdmin() {
  return {
    auth: authApi(),
    db: firestoreStore,
    storage: { bucket: getBucket },
  };
}
