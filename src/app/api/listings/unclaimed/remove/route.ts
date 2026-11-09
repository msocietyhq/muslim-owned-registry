import { NextRequest } from "next/server";
import { z } from "zod";
import { accountIsAdmin } from "@/lib/admin-accounts";
import { removeUnclaimedByActor } from "@/lib/claim-listing";
import { getOwner } from "@/lib/data";
import { historyActor } from "@/lib/history";
import { errorResponse, json, requireUser } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = z.object({ id: z.string().min(1) }).parse(await request.json());
    const isAdmin = await accountIsAdmin(user.email);
    const owner = await getOwner(user.uid);
    const actor = historyActor(user, isAdmin ? "admin" : "owner", owner?.displayName);
    await removeUnclaimedByActor({ id: body.id, actor, isAdmin });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Listing not found." }, 400);
    }
    return errorResponse(error);
  }
}
