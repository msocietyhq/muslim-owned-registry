import { NextRequest } from "next/server";
import { accountIsAdmin } from "@/lib/admin-accounts";
import { getRequestSession } from "@/lib/auth";
import { json } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request.headers);
  if (!session) return json({ user: null, isAdmin: false });
  return json({
    user: { uid: session.uid, email: session.email, name: session.name },
    isAdmin: await accountIsAdmin(session.email),
  });
}
