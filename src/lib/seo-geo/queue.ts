import { randomUUID } from "crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { buildReport, gatherQuestions } from "@/lib/seo-geo/brief";
import { redactVendorNames } from "@/lib/seo-geo/redact";
import {
  CHATS,
  JOBS,
  LOCKS,
  MESSAGES,
  SEO_GEO_LOCK_STALE_MS,
  getChatThread,
  writeLog,
  type SeoJob,
} from "@/lib/seo-geo/store";

function isFresh(iso: string | undefined, now: number) {
  if (!iso) return false;
  const at = Date.parse(iso);
  return !Number.isNaN(at) && now - at < SEO_GEO_LOCK_STALE_MS;
}

function asJob(id: string, data: Record<string, unknown>): SeoJob {
  const status = data.status;
  return {
    id,
    ownerId: String(data.ownerId || ""),
    chatId: String(data.chatId || ""),
    userMessageId: String(data.userMessageId || ""),
    assistantMessageId: String(data.assistantMessageId || ""),
    status:
      status === "running" || status === "done" || status === "failed" ? status : "queued",
    createdAt: String(data.createdAt || ""),
    claimedAt: data.claimedAt ? String(data.claimedAt) : null,
    finishedAt: data.finishedAt ? String(data.finishedAt) : null,
    error: data.error ? String(data.error) : null,
    unlimited: Boolean(data.unlimited),
    kind: data.kind === "report" ? "report" : "questions",
  };
}

async function listJobsByStatus(status: SeoJob["status"]) {
  const { db } = initAdmin();
  const snap = await db.collection(JOBS).where("status", "==", status).get();
  return snap.docs.map((doc) => asJob(doc.id, doc.data() || {}));
}

export async function queuePosition(jobId: string) {
  const queued = await listJobsByStatus("queued");
  const running = await listJobsByStatus("running");
  const waiters = [...running, ...queued].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const index = waiters.findIndex((job) => job.id === jobId);
  return index < 0 ? waiters.length + 1 : index + 1;
}

async function recoverStaleJobs(now: number) {
  const running = await listJobsByStatus("running");
  const { db } = initAdmin();
  for (const job of running) {
    if (isFresh(job.claimedAt || undefined, now)) continue;
    await db.collection(JOBS).doc(job.id).set({ status: "queued", claimedAt: null }, { merge: true });
  }
}

async function tryLock(nowIso: string, now: number) {
  const { db } = initAdmin();
  const lockRef = db.collection(LOCKS).doc("global");
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      const claimedAt = String(snap.data()?.claimedAt || "");
      if (isFresh(claimedAt, now)) {
        throw new Error("busy");
      }
      tx.set(lockRef, { claimedAt: nowIso, holder: randomUUID() });
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "busy") return false;
    throw error;
  }
}

async function unlock() {
  const { db } = initAdmin();
  await db.collection(LOCKS).doc("global").set({ claimedAt: null, holder: null });
}

async function claimOldestQueued() {
  const queued = (await listJobsByStatus("queued")).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const job = queued[0];
  if (!job) return null;
  const { db } = initAdmin();
  const now = new Date().toISOString();
  const ref = db.collection(JOBS).doc(job.id);
  let taken = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.status !== "queued") return;
    tx.set(ref, { status: "running", claimedAt: now }, { merge: true });
    taken = true;
  });
  if (!taken) return null;
  return { ...job, status: "running" as const, claimedAt: now };
}

async function finishJob(job: SeoJob, patch: Record<string, unknown>) {
  const { db } = initAdmin();
  await db.collection(JOBS).doc(job.id).set(
    {
      ...patch,
      finishedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

function publicJobError(detail: string) {
  const safe = redactVendorNames(detail).slice(0, 280);
  return `## Check failed\n\nThe background assistant stopped.\n\n**What failed:** ${safe}\n\nSend the same question again.`;
}

async function stillMine(chatId: string, jobId: string) {
  const { db } = initAdmin();
  const snap = await db.collection(CHATS).doc(chatId).get();
  return snap.exists && String(snap.data()?.activeJobId || "") === jobId;
}

async function recordActivity(chatId: string, jobId: string, note: string, journey: unknown) {
  if (!(await stillMine(chatId, jobId))) {
    throw new Error("cancelled");
  }
  const { db } = initAdmin();
  const snap = await db.collection(CHATS).doc(chatId).get();
  const prev = Array.isArray(snap.data()?.activity) ? (snap.data()?.activity as { at: string; text: string }[]) : [];
  const now = new Date().toISOString();
  const activity = [...prev, { at: now, text: note.slice(0, 180) }].slice(-20);
  await db.collection(CHATS).doc(chatId).set(
    {
      workingNote: note.slice(0, 180),
      activity,
      workStatus: "running",
      journey,
      heartbeatAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}

async function processJob(job: SeoJob) {
  const { db } = initAdmin();
  const thread = await getChatThread(job.ownerId, job.chatId);
  if (!thread) {
    await finishJob(job, { status: "failed", error: "Chat not found." });
    return;
  }
  const history = thread.messages
    .filter(
      (message) =>
        message.id !== job.assistantMessageId &&
        message.content &&
        message.status !== "pending" &&
        message.status !== "error",
    )
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.content }));
  void history;

  try {
    const progress = async (note: string) => {
      await recordActivity(job.chatId, job.id, note, thread.chat.journey);
    };
    if (job.kind === "report") {
      const result = await buildReport({
        brandName: thread.chat.brandName,
        domain: thread.chat.domain,
        snapshot: thread.chat.snapshot,
        questions: thread.chat.questions,
        answers: thread.chat.answers,
        evidence: thread.chat.evidence,
        onProgress: progress,
      });
      if (!(await stillMine(job.chatId, job.id))) return;
      const now = new Date().toISOString();
      await db.collection(CHATS).doc(job.chatId).set(
        {
          snapshot: result.snapshot,
          report: result.report,
          phase: "report",
          workStatus: "idle",
          workingNote: "",
          activity: [],
          lastError: "",
          activeJobId: null,
          updatedAt: now,
        },
        { merge: true },
      );
      await finishJob(job, { status: "done", error: null });
      await writeLog(job.ownerId, job.chatId, "report", "Report saved.");
      return;
    }
    const result = await gatherQuestions({
      brandName: thread.chat.brandName,
      domain: thread.chat.domain,
      onProgress: progress,
    });
    if (!(await stillMine(job.chatId, job.id))) return;
    const now = new Date().toISOString();
    await db.collection(CHATS).doc(job.chatId).set(
      {
        snapshot: result.snapshot,
        questions: result.questions,
        evidence: result.evidence,
        phase: "questions",
        workStatus: "idle",
        workingNote: "",
        activity: [],
        lastError: "",
        activeJobId: null,
        updatedAt: now,
      },
      { merge: true },
    );
    await finishJob(job, { status: "done", error: null });
    await writeLog(job.ownerId, job.chatId, "questions", `Saved ${result.questions.length} questions.`);
  } catch (error) {
    if (error instanceof Error && error.message === "cancelled") {
      await finishJob(job, { status: "failed", error: "Reset by owner." });
      return;
    }
    const detail = error instanceof Error ? error.message : "Job failed.";
    const now = new Date().toISOString();
    if (job.assistantMessageId) {
      await db.collection(MESSAGES).doc(job.assistantMessageId).set(
        {
          content: publicJobError(detail),
          status: "error",
          createdAt: now,
        },
        { merge: true },
      );
    }
    await db.collection(CHATS).doc(job.chatId).set(
      {
        workStatus: "idle",
        workingNote: "",
        phase: job.kind === "report" ? "questions" : "intro",
        lastError: redactVendorNames(detail).slice(0, 280),
        activeJobId: null,
        updatedAt: now,
      },
      { merge: true },
    );
    await finishJob(job, { status: "failed", error: detail });
    await writeLog(job.ownerId, job.chatId, "error", detail);
  }
}

export async function processSeoGeoQueue() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  await recoverStaleJobs(now);
  const locked = await tryLock(nowIso, now);
  if (!locked) return { processed: 0, skipped: "busy" as const };
  try {
    const job = await claimOldestQueued();
    if (!job) return { processed: 0, skipped: "empty" as const };
    await processJob(job);
    return { processed: 1, jobId: job.id };
  } finally {
    await unlock();
  }
}
