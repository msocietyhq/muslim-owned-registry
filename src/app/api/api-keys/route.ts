import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ApiKeyError,
  createApiKey,
  keyCreateAllowed,
  listApiKeys,
  revokeApiKey,
  userByEmail,
} from "@/lib/api-keys";
import { actorIsAdmin, errorResponse, HttpError, json, requireUser } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const isAdmin = await actorIsAdmin(user);
    const keys = await listApiKeys({ uid: user.uid, isAdmin });
    return json({ keys });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const isAdmin = await actorIsAdmin(user);
    const body = z
      .object({
        name: z.string().max(80).optional().default(""),
        role: z.enum(["admin", "owner"]).default("owner"),
        ownerEmail: z.string().email().optional(),
      })
      .parse(await request.json());
    if (!keyCreateAllowed({ actorIsAdmin: isAdmin, role: body.role })) {
      throw new HttpError(403, "Only an admin can create an admin API key.");
    }
    let uid = user.uid;
    let email = (user.email || "").trim().toLowerCase();
    if (body.role === "owner" && isAdmin && body.ownerEmail) {
      const owner = await userByEmail(body.ownerEmail);
      if (!owner) throw new HttpError(404, "That owner does not have an account yet.");
      uid = owner.uid;
      email = owner.email;
    }
    if (!email) throw new HttpError(400, "This account has no email.");
    const created = await createApiKey({
      name: body.name,
      role: body.role,
      uid,
      email,
      createdBy: user.uid,
    });
    return json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    if (error instanceof ApiKeyError) return json({ error: error.message }, error.status);
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const isAdmin = await actorIsAdmin(user);
    const body = z.object({ id: z.string().min(1) }).parse(await request.json());
    const key = await revokeApiKey(body.id, { uid: user.uid, isAdmin });
    return json({ key });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: "Missing key id." }, 400);
    if (error instanceof ApiKeyError) return json({ error: error.message }, error.status);
    return errorResponse(error);
  }
}
