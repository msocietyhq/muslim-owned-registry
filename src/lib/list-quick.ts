import { z } from "zod";
import { listingCreateSchema } from "@/lib/listing-update";

export const LIST_QUICK_PATH = "/list-for-free-in-3-minutes";
export const LIST_QUICK_VERIFY_PATH = `${LIST_QUICK_PATH}/verify`;
export const LIST_QUICK_PENDING = "listQuickPending";
export const LIST_QUICK_CHALLENGES = "listQuickChallenges";

export const guestIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const listQuickStartSchema = listingCreateSchema.extend({
  loginEmail: z.string().email(),
  guestId: guestIdSchema,
});

export function listQuickMagicUrl(params: { siteUrl: string; email: string; token: string }) {
  const query = new URLSearchParams({ email: params.email, token: params.token });
  return `${params.siteUrl}${LIST_QUICK_VERIFY_PATH}?${query.toString()}`;
}

export function isListQuickPhotoPath(path: string, guestId: string) {
  return path.startsWith(`list-quick/${guestId}/photos/`);
}

export function isListQuickUenPath(path: string, guestId: string) {
  return path.startsWith(`list-quick/${guestId}/uen/`);
}
