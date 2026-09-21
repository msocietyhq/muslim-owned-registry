import { NextRequest } from "next/server";
import { accountIsAdmin } from "@/lib/admin-accounts";
import { getRequestSession } from "@/lib/auth";
import { readFileRecord } from "@/lib/db/files";
import { json } from "@/lib/http";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const objectPath = path.map((part) => decodeURIComponent(part)).join("/");
  const file = await readFileRecord(objectPath);
  if (!file) return json({ error: "Not found." }, 404);

  if (!file.isPublic) {
    const token = request.nextUrl.searchParams.get("token");
    let allowed = false;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
          path?: string;
          exp?: number;
        };
        allowed = payload.path === objectPath && typeof payload.exp === "number" && payload.exp > Date.now();
      } catch {
        allowed = false;
      }
    }
    if (!allowed) {
      const session = await getRequestSession(request.headers);
      if (!session || !(await accountIsAdmin(session.email))) {
        return json({ error: "Not found." }, 404);
      }
    }
  }

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": file.isPublic ? "public, max-age=31536000, immutable" : "private, max-age=60",
    },
  });
}
