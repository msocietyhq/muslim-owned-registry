import { revalidatePath } from "next/cache";

export function revalidatePublicListing(slug?: string, ownerSlug?: string) {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/biz/${slug}`);
  if (ownerSlug) revalidatePath(`/owner/${ownerSlug}`);
  revalidatePath("/tags", "layout");
}
