import { randomUUID } from "crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { publicFileUrl } from "@/lib/db/files";
import { MAX_PHOTOS } from "@/lib/photos";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function storeListingPhotos(ownerId: string, files: File[]) {
  const { storage } = initAdmin();
  const bucket = storage.bucket();
  const urls: string[] = [];
  for (const file of files.slice(0, MAX_PHOTOS)) {
    if (!file || !file.size) continue;
    const type = file.type || "image/jpeg";
    if (!IMAGE_TYPES.has(type) && !type.startsWith("image/")) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "photo.jpg";
    const path = `listing-photos/${ownerId}/${randomUUID()}-${safeName}`;
    const object = bucket.file(path);
    await object.save(Buffer.from(await file.arrayBuffer()), {
      contentType: type,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    await object.makePublic().catch(() => undefined);
    urls.push(publicFileUrl(path));
  }
  return urls;
}
