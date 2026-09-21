import { NextRequest } from "next/server";
import { z } from "zod";
import { initAdmin } from "@/lib/firebase/admin";
import { errorResponse, json, requireAdmin } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { db } = initAdmin();
    const snap = await db
      .collection("adminTasks")
      .where("status", "==", "open")
      .get();
    const tasks = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) =>
        String((b as { createdAt?: string }).createdAt || "").localeCompare(
          String((a as { createdAt?: string }).createdAt || ""),
        ),
      );

    return json({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = z.object({ storagePath: z.string() }).parse(await request.json());
    const { storage } = initAdmin();
    const [url] = await storage.bucket().file(body.storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 60 * 1000,
    });
    return json({ url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Missing file path." }, 400);
    }
    return errorResponse(error);
  }
}
