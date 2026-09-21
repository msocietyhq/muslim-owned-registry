import { getFoundingClaimed } from "@/lib/founding";
import { errorResponse, json } from "@/lib/http";
import { getSearchCount } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [searches, foundingClaimed] = await Promise.all([
      getSearchCount(),
      getFoundingClaimed(),
    ]);
    return json({ searches, foundingClaimed });
  } catch (error) {
    return errorResponse(error);
  }
}
