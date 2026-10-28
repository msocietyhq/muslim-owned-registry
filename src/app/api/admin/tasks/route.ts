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

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = z
      .object({
        taskId: z.string(),
        action: z.literal("done"),
      })
      .parse(await request.json());
    const { db } = initAdmin();
    const taskRef = db.collection("adminTasks").doc(body.taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return json({ error: "Task not found." }, 404);
    }
    const task = taskSnap.data()!;
    if (String(task.type) !== "site_feedback") {
      return json({ error: "Use the listing actions for this task." }, 400);
    }
    if (String(task.status) !== "open") {
      return json({ error: "This task is already closed." }, 400);
    }
    await taskRef.set(
      {
        status: "done",
        resolvedAt: new Date().toISOString(),
        resolvedBy: admin.uid,
        resolutionNote: "Read",
      },
      { merge: true },
    );
    return json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Missing task." }, 400);
    }
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
