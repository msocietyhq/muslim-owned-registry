import { NextRequest } from "next/server";
import { accountIsAdmin } from "@/lib/admin-accounts";
import { authenticateApiKey } from "@/lib/api-keys";
import { getRequestSession } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }
  console.error(error);
  return json({ error: "Something went wrong." }, 500);
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || "";
}

export type RequestActor = {
  uid: string;
  email?: string | null;
  name?: string | null;
  apiRole?: "admin" | "owner";
};

export async function requireUser(request: NextRequest): Promise<RequestActor> {
  const token = bearerToken(request);
  if (token.startsWith("mosg_")) {
    const key = await authenticateApiKey(token);
    if (!key) throw new HttpError(401, "API key is invalid or revoked.");
    return { uid: key.uid, email: key.email, name: null, apiRole: key.role };
  }
  const session = await getRequestSession(request.headers);
  if (!session) throw new HttpError(401, "Sign in required.");
  return session;
}

export async function actorIsAdmin(user: RequestActor) {
  if (user.apiRole === "owner") return false;
  return accountIsAdmin(user.email);
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (!(await actorIsAdmin(user))) {
    throw new HttpError(403, "Admin access required.");
  }
  return user;
}

export { siteUrl };
