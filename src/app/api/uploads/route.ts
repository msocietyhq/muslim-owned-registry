import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { errorResponse, HttpError, json, requireAdmin, requireUser } from "@/lib/http";
import { initAdmin } from "@/lib/firebase/admin";
import { publicFileUrl } from "@/lib/db/files";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const kind = String(form.get("kind") || "photo");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      throw new HttpError(400, "Choose a file.");
    }
    if (file.size > MAX_BYTES) {
      throw new HttpError(400, "That file is too large. Use a file under 8 MB.");
    }
    const type = file.type || "";
    const photo = kind === "photo" || kind === "team";
    const uen = kind === "uen";
    if (photo && !type.startsWith("image/")) {
      throw new HttpError(400, "Photos must be image files.");
    }
    if (uen && !type.startsWith("image/") && type !== "application/pdf") {
      throw new HttpError(400, "Upload a PDF or an image of the UEN document.");
    }
    if (!photo && !uen) {
      throw new HttpError(400, "That file type is not allowed.");
    }

    const user = kind === "team" ? await requireAdmin(request) : await requireUser(request);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "file";
    const folder = kind === "team" ? "team-photos" : kind === "uen" ? "uen" : "listing-photos";
    const path = `${folder}/${user.uid}/${randomUUID()}-${safeName}`;
    const { storage } = initAdmin();
    const object = storage.bucket().file(path);
    await object.save(Buffer.from(await file.arrayBuffer()), {
      contentType: type || (photo ? "image/jpeg" : "application/pdf"),
      metadata: { cacheControl: photo ? "public, max-age=31536000" : "private" },
    });
    if (photo) await object.makePublic();
    return json({
      path,
      url: photo ? publicFileUrl(path) : undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
