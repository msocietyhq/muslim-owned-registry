import { initAdmin } from "@/lib/firebase/admin";
import { normalizeJourney, type JourneyState } from "@/lib/seo-geo/journey";
import { redactVendorNames } from "@/lib/seo-geo/redact";
import type { DomainSnapshot } from "@/lib/seo-geo/dataforseo";
import type { SeoAnswer, SeoPhase, SeoQuestion, SeoReport } from "@/lib/seo-geo/flow";

export const CHATS = "seo_geo_chats";
export const MESSAGES = "seo_geo_messages";
export const LOGS = "seo_geo_logs";
export const RATES = "seo_geo_rates";
export const JOBS = "seo_geo_jobs";
export const LOCKS = "seo_geo_locks";

export const SEO_GEO_LOCK_STALE_MS = 6 * 60 * 1000;

export type SeoWorkStatus = "idle" | "queued" | "running";
export type SeoMessageStatus = "done" | "pending" | "error";
export type SeoJobStatus = "queued" | "running" | "done" | "failed";

export type SeoActivity = { at: string; text: string };

export type SeoChat = {
  id: string;
  ownerId: string;
  businessId: string;
  brandName: string;
  domain: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  snapshot: DomainSnapshot | null;
  journey: JourneyState;
  workStatus: SeoWorkStatus;
  workingNote: string;
  lastError: string;
  activeJobId: string | null;
  activity: SeoActivity[];
  phase: SeoPhase;
  questions: SeoQuestion[];
  answers: SeoAnswer[];
  report: SeoReport | null;
  evidence: string;
};

export type SeoMessage = {
  id: string;
  chatId: string;
  ownerId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status: SeoMessageStatus;
  jobId: string | null;
};

export type SeoJob = {
  id: string;
  ownerId: string;
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: SeoJobStatus;
  createdAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  unlimited: boolean;
  kind: "questions" | "report";
};

function asActivity(value: unknown): SeoActivity[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return { at: String(item.at || ""), text: String(item.text || "") };
    })
    .filter((row) => row.text)
    .slice(-20);
}

export function asChat(id: string, data: Record<string, unknown>): SeoChat {
  const work = data.workStatus;
  return {
    id,
    ownerId: String(data.ownerId || ""),
    businessId: String(data.businessId || ""),
    brandName: String(data.brandName || ""),
    domain: String(data.domain || ""),
    title: String(data.title || ""),
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
    snapshot: (data.snapshot as DomainSnapshot | null) || null,
    journey: normalizeJourney(data.journey),
    workStatus: work === "queued" || work === "running" ? work : "idle",
    workingNote: String(data.workingNote || ""),
    lastError: String(data.lastError || ""),
    activeJobId: data.activeJobId ? String(data.activeJobId) : null,
    activity: asActivity(data.activity),
    phase: (["intro", "gathering", "questions", "reporting", "report"] as const).includes(
      data.phase as SeoPhase,
    )
      ? (data.phase as SeoPhase)
      : "intro",
    questions: Array.isArray(data.questions) ? (data.questions as SeoQuestion[]) : [],
    answers: Array.isArray(data.answers) ? (data.answers as SeoAnswer[]) : [],
    report: data.report && typeof data.report === "object" ? (data.report as SeoReport) : null,
    evidence: String(data.evidence || ""),
  };
}

export function asMessage(id: string, data: Record<string, unknown>): SeoMessage {
  const status = data.status;
  return {
    id,
    chatId: String(data.chatId || ""),
    ownerId: String(data.ownerId || ""),
    role: data.role === "assistant" ? "assistant" : "user",
    content: String(data.content || ""),
    createdAt: String(data.createdAt || ""),
    status: status === "pending" || status === "error" ? status : "done",
    jobId: data.jobId ? String(data.jobId) : null,
  };
}

export async function writeLog(ownerId: string, chatId: string, event: string, message: string) {
  const { db } = initAdmin();
  await db.collection(LOGS).add({
    ownerId,
    chatId,
    event,
    message: redactVendorNames(message).slice(0, 500),
    createdAt: new Date().toISOString(),
  });
}

export async function ownedChat(ownerId: string, chatId: string) {
  const { db } = initAdmin();
  const snap = await db.collection(CHATS).doc(chatId).get();
  if (!snap.exists) return null;
  const chat = asChat(snap.id, snap.data() || {});
  if (chat.ownerId !== ownerId) return null;
  return chat;
}

export async function getChatThread(ownerId: string, chatId: string) {
  const chat = await ownedChat(ownerId, chatId);
  if (!chat) return null;
  const { db } = initAdmin();
  const snap = await db.collection(MESSAGES).where("chatId", "==", chatId).get();
  const messages = snap.docs
    .map((doc) => asMessage(doc.id, doc.data() || {}))
    .filter((row) => row.ownerId === ownerId)
    .sort((a, b) => {
      const time = a.createdAt.localeCompare(b.createdAt);
      if (time !== 0) return time;
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  return { chat, messages };
}
