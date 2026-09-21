import { NextRequest } from "next/server";
import { accountIsAdmin } from "@/lib/admin-accounts";
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

export async function requireUser(request: NextRequest) {
  const session = await getRequestSession(request.headers);
  if (!session) throw new HttpError(401, "Sign in required.");
  return session;
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (!(await accountIsAdmin(user.email))) {
    throw new HttpError(403, "Admin access required.");
  }
  return user;
}

export { siteUrl };
