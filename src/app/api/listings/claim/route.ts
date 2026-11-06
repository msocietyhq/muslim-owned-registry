import { NextRequest } from "next/server";
import { z } from "zod";
import { claimUnclaimedListing } from "@/lib/claim-listing";
import { getBusinessBySlug, getBusinessesByOwner, getOwner } from "@/lib/data";
import { errorResponse, HttpError, json, requireUser } from "@/lib/http";
import { TERMS_CLAUSE_COUNT } from "@/lib/legal";
import { TERMS_VERSION } from "@/lib/types";
import { accountOwnerIds, listingIsUnclaimed } from "@/lib/unclaimed";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const slug = request.nextUrl.searchParams.get("slug")?.trim() || "";
    if (!slug) throw new HttpError(400, "Missing listing.");
    const source = await getBusinessBySlug(slug);
    if (!source || source.status !== "live") throw new HttpError(404, "Listing not found.");
    const accountIds = await accountOwnerIds();
    if (!listingIsUnclaimed(source, accountIds)) {
      throw new HttpError(400, "This listing already has an account.");
    }
    const owner = await getOwner(user.uid);
    const mine = await getBusinessesByOwner(user.uid);
    const existing = mine.find(
      (row) => row.supersedesBusinessId === source.id && row.status !== "removed",
    );
    return json({
      brandName: source.brandName,
      registeredName: source.registeredName,
      needsTerms: owner?.termsVersion !== TERMS_VERSION,
      alreadyClaimed: Boolean(existing),
      businessId: existing?.id || null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user.email) throw new HttpError(400, "Your account needs an email address.");
    const body = z
      .object({
        slug: z.string().min(1).max(120),
        acceptTerms: z.boolean().optional(),
        acceptedClauseCount: z.number().optional(),
        termsCopy: z.string().max(8000).optional(),
      })
      .parse(await request.json());
    if (body.acceptTerms && body.acceptedClauseCount !== TERMS_CLAUSE_COUNT) {
      throw new HttpError(400, "Accept the current terms to claim this listing.");
    }
    const result = await claimUnclaimedListing({
      user: { uid: user.uid, email: user.email, name: user.name },
      slug: body.slug,
      acceptTerms: body.acceptTerms,
      termsCopy: body.termsCopy,
    });
    return json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Check the form." }, 400);
    }
    return errorResponse(error);
  }
}
