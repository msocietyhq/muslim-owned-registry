import type { BusinessStatus } from "@/lib/types";

export function ownerIdentityLocked(status: BusinessStatus) {
  return (
    status === "live" ||
    status === "unpublished" ||
    status === "pending_activation" ||
    status === "removed"
  );
}

/** Published (or once-published) listings keep their page link. Pending drafts may share a slug. */
export function listingSlugReserved(status: BusinessStatus) {
  return status === "live" || status === "unpublished" || status === "pending_activation";
}

export function listingNeedsReview(
  data: {
    uen?: string;
    registeredName?: string;
  },
  current: {
    uen: string;
    registeredName: string;
  },
) {
  if (data.uen !== undefined && data.uen.trim().toUpperCase() !== current.uen) return true;
  if (data.registeredName !== undefined && data.registeredName.trim() !== current.registeredName) {
    return true;
  }
  return false;
}
