import { NextRequest } from "next/server";
import { z } from "zod";
import {
  ADMIN_NEED_EMAIL,
  ADMIN_SELF,
  assertCanSetAdminRole,
  existingAuthUser,
  listAdminAccounts,
  setAdminRole,
} from "@/lib/admin-accounts";
import { getOrCreateOwnerAccount } from "@/lib/ensure-owner";
import { errorResponse, HttpError, json, requireAdmin } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const admins = await listAdminAccounts(admin.email || "");
    return json({ admins });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = z
      .object({
        email: z.string().email(),
        admin: z.boolean(),
      })
      .parse(await request.json());
    const { target } = assertCanSetAdminRole(admin.email || "", body.email, body.admin);
    const owner = body.admin
      ? await getOrCreateOwnerAccount(target)
      : await existingAuthUser(target);
    const result = await setAdminRole(admin, {
      email: target,
      admin: body.admin,
      uid: owner?.uid || null,
    });
    return json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: ADMIN_NEED_EMAIL }, 400);
    }
    if (error instanceof HttpError) return errorResponse(error);
    if (error instanceof Error && (error.message === ADMIN_SELF || error.message === ADMIN_NEED_EMAIL)) {
      return json({ error: error.message }, 400);
    }
    return errorResponse(error);
  }
}
