import { NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { errorResponse, HttpError, json, requireAdmin } from "@/lib/http";
import { createTeamMember, deleteTeamMember, listTeamMembers } from "@/lib/team-data";

function refreshWhoWeAre() {
  revalidatePath("/who-we-are");
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const members = await listTeamMembers();
    return json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = z
      .object({
        name: z.string().max(80).optional().nullable(),
        photoUrl: z.string().max(2000).optional().nullable(),
        url: z.string().max(500).optional().nullable(),
      })
      .parse(await request.json());
    const member = await createTeamMember(body);
    refreshWhoWeAre();
    return json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: error.issues[0]?.message || "Check the form." }, 400);
    }
    if (error instanceof HttpError) return errorResponse(error);
    if (error instanceof Error) {
      return json({ error: error.message }, 400);
    }
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) throw new HttpError(400, "Missing person id.");
    const ok = await deleteTeamMember(id);
    if (!ok) throw new HttpError(404, "That person is not on the page.");
    refreshWhoWeAre();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
