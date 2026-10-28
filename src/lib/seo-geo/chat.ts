import { randomUUID } from "crypto";
import { initAdmin } from "@/lib/firebase/admin";
import { getBusinessesByOwner } from "@/lib/data";
import { runtimeEnv } from "@/lib/runtime-env";
import {
  messagesRemaining,
  recentMessageTimes,
  seoGeoCapsOff,
  seoGeoMessageMax,
} from "@/lib/seo-geo/config";
import { eligibleDomains, matchEligibleDomain, type EligibleDomain } from "@/lib/seo-geo/domains";
import { siteChatId, uniqueChatsByDomain } from "@/lib/seo-geo/ids";
import { answersComplete, type SeoAnswer } from "@/lib/seo-geo/flow";
import { emptyJourney } from "@/lib/seo-geo/journey";
import { queuePosition } from "@/lib/seo-geo/queue";
import {
  CHATS,
  JOBS,
  MESSAGES,
  RATES,
  asChat,
  getChatThread,
  ownedChat,
  writeLog,
  type SeoChat,
  type SeoMessage,
} from "@/lib/seo-geo/store";

export { getChatThread };
export type { EligibleDomain, SeoChat, SeoMessage };

export async function listEligibleDomains(ownerId: string) {
  const businesses = await getBusinessesByOwner(ownerId, true);
  return eligibleDomains(businesses);
}

export async function allowance(ownerId: string, email?: string | null) {
  if (seoGeoCapsOff(email)) {
    return { remaining: null as number | null, used: 0, unlimited: true as const };
  }
  const { db } = initAdmin();
  const snap = await db.collection(RATES).doc(ownerId).get();
  const timestamps = Array.isArray(snap.data()?.timestamps)
    ? (snap.data()?.timestamps as string[])
    : [];
  const recent = recentMessageTimes(timestamps);
  return { remaining: messagesRemaining(timestamps), used: recent.length, unlimited: false as const };
}

async function consumeAllowance(ownerId: string) {
  const { db } = initAdmin();
  const ref = db.collection(RATES).doc(ownerId);
  const snap = await ref.get();
  const timestamps = Array.isArray(snap.data()?.timestamps)
    ? (snap.data()?.timestamps as string[])
    : [];
  const recent = recentMessageTimes(timestamps);
  if (messagesRemaining(recent) < 1) {
    return { ok: false as const, remaining: 0 };
  }
  const next = [...recent, new Date().toISOString()];
  await ref.set({ ownerId, timestamps: next });
  return { ok: true as const, remaining: messagesRemaining(next) };
}

export async function listChats(ownerId: string) {
  const { db } = initAdmin();
  const snap = await db.collection(CHATS).where("ownerId", "==", ownerId).get();
  const chats = snap.docs.map((doc) => asChat(doc.id, doc.data() || {}));
  return uniqueChatsByDomain(chats);
}

export async function openSiteChat(ownerId: string, rawDomain: string) {
  const allowed = await listEligibleDomains(ownerId);
  const matched = matchEligibleDomain(rawDomain, allowed);
  if (!matched.ok) {
    const message =
      matched.reason === "social"
        ? "Social profiles cannot be analysed here. Use the company website on your live listing."
        : "That domain is not a website on one of your live listings.";
    return { ok: false as const, error: message, domains: allowed };
  }
  const id = siteChatId(ownerId, matched.match.domain);
  const existing =
    (await ownedChat(ownerId, id)) ||
    (await listChats(ownerId)).find((chat) => chat.domain === matched.match.domain);
  if (existing) {
    const position = existing.activeJobId ? await queuePosition(existing.activeJobId) : 0;
    return { ok: true as const, chat: existing, queuePosition: position };
  }
  const now = new Date().toISOString();
  const { db } = initAdmin();
  const chat: SeoChat = {
    id,
    ownerId,
    businessId: matched.match.businessId,
    brandName: matched.match.brandName,
    domain: matched.match.domain,
    title: matched.match.domain,
    createdAt: now,
    updatedAt: now,
    snapshot: null,
    journey: emptyJourney(),
    workStatus: "idle",
    workingNote: "",
    lastError: "",
    activeJobId: null,
    activity: [],
    phase: "intro",
    questions: [],
    answers: [],
    report: null,
    evidence: "",
  };
  await db.collection(CHATS).doc(id).set({ ...chat });
  await writeLog(
    ownerId,
    id,
    "snapshot",
    "Opened the website chat.",
  );
  return { ok: true as const, chat, queuePosition: 0 };
}

export async function sendChatMessage(
  ownerId: string,
  chatId: string,
  rawText: string,
  email?: string | null,
) {
  const text = rawText.trim();
  if (!text) return { ok: false as const, status: 400, error: "Write a message first." };
  const maxChars = seoGeoMessageMax(email);
  if (Number.isFinite(maxChars) && text.length > maxChars) {
    return { ok: false as const, status: 400, error: "Keep the message under 4000 characters." };
  }
  const thread = await getChatThread(ownerId, chatId);
  if (!thread) return { ok: false as const, status: 404, error: "Chat not found." };
  if (thread.chat.workStatus === "queued" || thread.chat.workStatus === "running") {
    const position = thread.chat.activeJobId ? await queuePosition(thread.chat.activeJobId) : 1;
    const quota = await allowance(ownerId, email);
    return {
      ok: false as const,
      status: 409,
      error: "Wait for the current check to finish.",
      remaining: quota.remaining,
      queuePosition: position,
    };
  }

  const unlimited = seoGeoCapsOff(email);
  let remaining: number | null = null;
  if (unlimited) {
    remaining = null;
  } else {
    const gate = await consumeAllowance(ownerId);
    if (!gate.ok) {
      return {
        ok: false as const,
        status: 429,
        error: "You have used 15 messages in the last hour. Try again later.",
        remaining: 0,
      };
    }
    remaining = gate.remaining;
  }

  if (!runtimeEnv("DEEPSEEK_API_KEY")) {
    await writeLog(ownerId, chatId, "error", "Chat model is not configured.");
    return {
      ok: false as const,
      status: 503,
      error: "The assistant is not configured yet.",
      remaining,
    };
  }

  const now = new Date().toISOString();
  const { db } = initAdmin();
  const jobId = randomUUID();
  const assistantAt = new Date(Date.parse(now) + 1).toISOString();
  const userMessage: SeoMessage = {
    id: randomUUID(),
    chatId,
    ownerId,
    role: "user",
    content: text,
    createdAt: now,
    status: "done",
    jobId,
  };
  const assistant: SeoMessage = {
    id: randomUUID(),
    chatId,
    ownerId,
    role: "assistant",
    content: "",
    createdAt: assistantAt,
    status: "pending",
    jobId,
  };
  await db.collection(MESSAGES).doc(userMessage.id).set({ ...userMessage });
  await db.collection(MESSAGES).doc(assistant.id).set({ ...assistant });
  await db.collection(JOBS).doc(jobId).set({
    id: jobId,
    ownerId,
    chatId,
    userMessageId: userMessage.id,
    assistantMessageId: assistant.id,
    status: "queued",
    createdAt: now,
    claimedAt: null,
    finishedAt: null,
    error: null,
    unlimited,
    kind: "questions",
  });
  await db.collection(CHATS).doc(chatId).set(
    {
      updatedAt: now,
      workStatus: "queued",
      workingNote: "Queued. Waiting for a free worker.",
      activity: [{ at: now, text: "Queued. Waiting for a free worker." }],
      lastError: "",
      activeJobId: jobId,
    },
    { merge: true },
  );
  await writeLog(ownerId, chatId, "queued", `Job ${jobId} queued.`);
  const position = await queuePosition(jobId);
  return {
    ok: true as const,
    queued: true as const,
    message: assistant,
    remaining,
    queuePosition: position,
  };
}

export async function resetOwnerSeoGeo(ownerId: string) {
  const { db } = initAdmin();
  const chats = await db.collection(CHATS).where("ownerId", "==", ownerId).get();
  let messages = 0;
  for (const chat of chats.docs) {
    const rows = await db.collection(MESSAGES).where("chatId", "==", chat.id).get();
    for (const row of rows.docs) {
      await row.ref.delete();
      messages += 1;
    }
    await chat.ref.delete();
  }
  const jobs = await db.collection(JOBS).where("ownerId", "==", ownerId).get();
  const now = new Date().toISOString();
  for (const job of jobs.docs) {
    const status = String(job.data()?.status || "");
    if (status === "queued" || status === "running") {
      await job.ref.set({ status: "failed", error: "Reset by owner.", finishedAt: now }, { merge: true });
    }
  }
  return { chats: chats.docs.length, messages };
}

export async function threadPayload(ownerId: string, chatId: string) {
  const thread = await getChatThread(ownerId, chatId);
  if (!thread) return null;
  const position = thread.chat.activeJobId ? await queuePosition(thread.chat.activeJobId) : 0;
  return { ...thread, queuePosition: position };
}

async function enqueue(ownerId: string, chatId: string, kind: "questions" | "report", phase: "gathering" | "reporting") {
  if (!runtimeEnv("DEEPSEEK_API_KEY")) {
    return { ok: false as const, status: 503, error: "The assistant is not configured yet." };
  }
  const now = new Date().toISOString();
  const { db } = initAdmin();
  const jobId = randomUUID();
  await db.collection(JOBS).doc(jobId).set({
    id: jobId,
    ownerId,
    chatId,
    userMessageId: "",
    assistantMessageId: "",
    status: "queued",
    createdAt: now,
    claimedAt: null,
    finishedAt: null,
    error: null,
    unlimited: true,
    kind,
  });
  await db.collection(CHATS).doc(chatId).set(
    {
      updatedAt: now,
      phase,
      workStatus: "queued",
      workingNote: "Queued. Waiting for a free worker.",
      activity: [{ at: now, text: "Queued. Waiting for a free worker." }],
      lastError: "",
      activeJobId: jobId,
    },
    { merge: true },
  );
  return { ok: true as const, queuePosition: await queuePosition(jobId) };
}

export async function startQuestions(ownerId: string, chatId: string) {
  const thread = await getChatThread(ownerId, chatId);
  if (!thread) return { ok: false as const, status: 404, error: "Chat not found." };
  if (thread.chat.workStatus !== "idle") {
    return { ok: false as const, status: 409, error: "Wait for the current check to finish." };
  }
  return enqueue(ownerId, chatId, "questions", "gathering");
}

export async function submitAnswers(ownerId: string, chatId: string, answers: SeoAnswer[]) {
  const thread = await getChatThread(ownerId, chatId);
  if (!thread) return { ok: false as const, status: 404, error: "Chat not found." };
  if (thread.chat.workStatus !== "idle" || thread.chat.phase !== "questions") {
    return { ok: false as const, status: 409, error: "Answer the questions after the site check finishes." };
  }
  if (!answersComplete(thread.chat.questions, answers)) {
    return { ok: false as const, status: 400, error: "Answer every question." };
  }
  const { db } = initAdmin();
  await db.collection(CHATS).doc(chatId).set({ answers }, { merge: true });
  return enqueue(ownerId, chatId, "report", "reporting");
}
