import { NextRequest } from "next/server";
import { actorIsAdmin, errorResponse, json, requireUser } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const isAdmin = await actorIsAdmin(user);
    return json({
      uid: user.uid,
      email: user.email || "",
      name: user.name || null,
      role: isAdmin ? "admin" : "owner",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
