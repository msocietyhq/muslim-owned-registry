import { files } from "./schema";
import { getDb } from "./client";
import { eq } from "drizzle-orm";

export function publicFileUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/api/files/${encodeURIComponent(path)}`;
}

export function getBucket() {
  return {
    get name() {
      return "neon";
    },
    file(objectPath: string) {
      return {
        async save(
          bytes: Buffer,
          options?: {
            contentType?: string;
            metadata?: { cacheControl?: string; metadata?: Record<string, string> };
            resumable?: boolean;
          },
        ) {
          const db = await getDb();
          const isPublic = options?.metadata?.cacheControl?.includes("public") || false;
          await db
            .insert(files)
            .values({
              path: objectPath,
              contentType: options?.contentType || "application/octet-stream",
              isPublic,
              bytes,
              createdAt: new Date(),
            })
            .onConflictDoUpdate({
              target: files.path,
              set: {
                contentType: options?.contentType || "application/octet-stream",
                isPublic,
                bytes,
              },
            });
        },
        async makePublic() {
          const db = await getDb();
          await db.update(files).set({ isPublic: true }).where(eq(files.path, objectPath));
        },
        async getSignedUrl(opts: { action: "read"; expires: number }) {
          const token = Buffer.from(
            JSON.stringify({ path: objectPath, exp: opts.expires }),
          ).toString("base64url");
          return [`${publicFileUrl(objectPath)}?token=${token}`];
        },
      };
    },
  };
}

export async function readFileRecord(objectPath: string) {
  const db = await getDb();
  const [row] = await db.select().from(files).where(eq(files.path, objectPath)).limit(1);
  return row || null;
}
