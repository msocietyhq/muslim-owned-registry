"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminAccounts } from "@/components/admin-accounts";
import { AdminTeam } from "@/components/admin-team";
import { MarkdownBody } from "@/components/markdown-body";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { withCount } from "@/lib/stats-client";
import type { AdminTask, BusinessStatus } from "@/lib/types";
import type { SiteVisitorStats } from "@/lib/site-analytics-core";
import { badgeTone, ui } from "@/lib/ui";

type ListingClickRow = {
  id: string;
  brandName: string;
  slug: string;
  status: BusinessStatus;
  clicks: number;
  uniqueViews: number;
};

const TABS = ["tasks", "visitors", "listings", "people", "admins", "add"] as const;
type Tab = (typeof TABS)[number];

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "tasks";
  const id = window.location.hash.replace("#", "") as Tab;
  return TABS.includes(id) ? id : "tasks";
}

export default function AdminPage() {
  const { t } = useCopy();
  const { user, isAdmin, ready } = useAuthUser();
  const [tab, setTab] = useState<Tab>("tasks");
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [visitors, setVisitors] = useState<SiteVisitorStats>({
    uniqueVisitors: 0,
    totalVisitors: 0,
  });
  const [listings, setListings] = useState<ListingClickRow[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [fileUrl, setFileUrl] = useState<Record<string, string>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    setTab(tabFromHash());
    function onHash() {
      setTab(tabFromHash());
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    if (!isAdmin) {
      setError(t.adminPage.notAdmin);
      return;
    }
    setIsAdminUser(true);
    (async () => {
      try {
        const [taskResult, analyticsResult] = await Promise.allSettled([
          api<{ tasks: AdminTask[] }>("/api/admin/tasks"),
          api<{ visitors: SiteVisitorStats; listings: ListingClickRow[] }>(
            "/api/admin/analytics",
          ),
        ]);
        if (taskResult.status === "fulfilled") {
          setTasks(taskResult.value.tasks);
        } else {
          throw taskResult.reason;
        }
        if (analyticsResult.status === "fulfilled") {
          setVisitors(
            analyticsResult.value.visitors || { uniqueVisitors: 0, totalVisitors: 0 },
          );
          setListings(analyticsResult.value.listings || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.adminPage.loadError);
      }
    })();
  }, [isAdmin, ready, t.adminPage.loadError, t.adminPage.notAdmin, user]);

  function openTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  async function act(taskId: string, action: "accept" | "reject" | "remove") {
    if (action === "reject" && (note[taskId] || "").trim().length < 10) {
      setError(t.adminPage.rejectNeedNote);
      return;
    }
    setError("");
    try {
      await api("/api/businesses", {
        method: "PUT",
        body: JSON.stringify({ taskId, action, note: note[taskId] || "" }),
      });
      const data = await api<{ tasks: AdminTask[] }>("/api/admin/tasks");
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    }
  }

  async function closeFeedback(taskId: string) {
    setError("");
    try {
      await api("/api/admin/tasks", {
        method: "PUT",
        body: JSON.stringify({ taskId, action: "done" }),
      });
      const data = await api<{ tasks: AdminTask[] }>("/api/admin/tasks");
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminPage.loadError);
    }
  }

  async function openFile(task: AdminTask) {
    if (!task.uenStoragePath) return;
    const data = await api<{ url: string }>("/api/admin/tasks", {
      method: "POST",
      body: JSON.stringify({ storagePath: task.uenStoragePath }),
    });
    setFileUrl((current) => ({ ...current, [task.id]: data.url }));
  }

  const tabLabels: Record<Tab, string> = {
    tasks: t.adminPage.tabTasks,
    visitors: t.adminPage.tabVisitors,
    listings: t.adminPage.tabListings,
    people: t.adminPage.tabPeople,
    admins: t.adminPage.tabAdmins,
    add: t.adminPage.tabAdd,
  };

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.adminPage.title}</h1>
      <p className={ui.small}>{t.adminPage.lead}</p>
      {error ? <p className={`${ui.noticeError} mt-3`}>{error}</p> : null}

      {isAdminUser ? (
        <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-2" role="tablist" aria-label={t.adminPage.title}>
            {TABS.map((id) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`${ui.chip} border ${
                    active
                      ? "border-mihrab bg-mihrab text-paper"
                      : "border-mihrab/20 bg-surface text-mihrab"
                  }`}
                  onClick={() => openTab(id)}
                >
                  {tabLabels[id]}
                  {id === "tasks" && tasks.length ? ` (${tasks.length})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isAdminUser && tab === "add" ? (
        <section className="mt-8 max-w-[54ch]">
          <h2 className={ui.sectionTitle}>{t.adminPage.addForOthersTitle}</h2>
          <p className="mb-6 leading-relaxed">{t.adminPage.addForOthersLead}</p>
          <Link className={ui.button} href="/admin/add-for-others">
            {t.adminPage.addForOthersCta}
          </Link>
        </section>
      ) : null}

      {isAdminUser && tab === "admins" ? <div className="mt-8"><AdminAccounts /></div> : null}
      {isAdminUser && tab === "people" ? <div className="mt-8"><AdminTeam /></div> : null}

      {isAdminUser && tab === "visitors" ? (
        <section className="mt-8">
          <h2 className={ui.sectionTitle}>{t.adminPage.visitorsTitle}</h2>
          <p className={`${ui.small} mb-4 max-w-[54ch]`}>{t.adminPage.visitorsLead}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <p className={ui.card}>{withCount(t.adminPage.uniqueVisitors, visitors.uniqueVisitors)}</p>
            <p className={ui.card}>{withCount(t.adminPage.totalVisitors, visitors.totalVisitors)}</p>
          </div>
        </section>
      ) : null}

      {isAdminUser && tab === "listings" ? (
        <section className="mt-8">
          <h2 className={ui.sectionTitle}>{t.adminPage.clicksTitle}</h2>
          <p className={`${ui.small} mb-4 max-w-[54ch]`}>{t.adminPage.clicksLead}</p>
          {listings.length === 0 ? (
            <p className={ui.small}>{t.adminPage.emptyListings}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th className={ui.th}>{t.adminPage.listing}</th>
                    <th className={ui.th}>{t.app.status}</th>
                    <th className={ui.th}>{t.adminPage.clicksCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className={ui.td}>
                        {listing.status === "live" ? (
                          <Link href={`/biz/${listing.slug}`} className={ui.link}>
                            {listing.brandName}
                          </Link>
                        ) : (
                          listing.brandName
                        )}
                        <p className={ui.small}>
                          {withCount(t.adminPage.uniqueOpens, listing.uniqueViews)}
                        </p>
                        <p className="mt-1">
                          <Link href={`/admin/listings/${listing.id}`} className={ui.link}>
                            {t.adminPage.edit}
                          </Link>
                        </p>
                      </td>
                      <td className={ui.td}>
                        <span className={`${ui.badge} ${badgeTone(listing.status)}`}>
                          {(t.status as Record<string, string>)[listing.status] ||
                            listing.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={ui.td}>
                        {withCount(t.adminPage.clicks, listing.clicks)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {isAdminUser && tab === "tasks" && tasks.length === 0 && !error ? (
        <p className={`${ui.small} mt-10`}>{t.adminPage.none}</p>
      ) : null}
      {isAdminUser && tab === "tasks"
        ? tasks.map((task) => {
            if (task.type === "site_feedback") {
              const from = String(task.payload.fromEmail || task.payload.email || "");
              const message = String(task.payload.message || "");
              const prompt = String(task.payload.prompt || "");
              return (
                <article key={task.id} className={ui.section}>
                  <p className={ui.kicker}>{t.adminPage.feedbackTask}</p>
                  <h2 className={ui.sectionTitle}>{from}</h2>
                  <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
                  {prompt ? (
                    <>
                      <p className={`${ui.kicker} mt-6`}>{t.adminPage.feedbackPrompt}</p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-rule bg-leaf p-4 font-sans text-sm leading-relaxed">
                        {prompt}
                      </pre>
                    </>
                  ) : null}
                  <p className="mt-4">
                    <button className={ui.button} type="button" onClick={() => closeFeedback(task.id)}>
                      {t.adminPage.feedbackDone}
                    </button>
                  </p>
                </article>
              );
            }
            const payload = task.payload as {
              brandName?: string;
              registeredName?: string;
              uen?: string;
              contactEmail?: string;
              verificationType?: string;
              linkedinUrl?: string;
              slug?: string;
              summary?: string;
              description?: string;
            };
            return (
              <article key={task.id} className={ui.section}>
                <p className={ui.kicker}>{task.type.replace("_", " ")}</p>
                <h2 className={ui.sectionTitle}>{payload.brandName || task.businessId}</h2>
                <p>
                  {payload.registeredName} · UEN {payload.uen} · {payload.contactEmail}
                </p>
                <p>Path: {payload.verificationType}</p>
                {payload.summary ? <p className="mt-3 leading-relaxed">{payload.summary}</p> : null}
                {payload.description ? (
                  <MarkdownBody content={payload.description} className="mt-3 max-w-[62ch]" />
                ) : null}
                {payload.linkedinUrl ? (
                  <p>
                    <a href={payload.linkedinUrl} rel="noreferrer" className={ui.link}>
                      {payload.linkedinUrl}
                    </a>
                  </p>
                ) : null}
                {task.uenStoragePath ? (
                  <p>
                    <button
                      className={ui.buttonSecondary}
                      type="button"
                      onClick={() => openFile(task)}
                    >
                      Open UEN document
                    </button>
                    {fileUrl[task.id] ? (
                      <>
                        {" "}
                        <a href={fileUrl[task.id]} rel="noreferrer" className={ui.link}>
                          View file
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <label className={`${ui.label} mt-4`} htmlFor={`note-${task.id}`}>
                  {t.adminPage.rejectNote}
                </label>
                <p className={`${ui.small} mb-1.5`}>{t.adminPage.rejectNoteHint}</p>
                <textarea
                  className={ui.textarea}
                  id={`note-${task.id}`}
                  value={note[task.id] || ""}
                  onChange={(event) =>
                    setNote((current) => ({ ...current, [task.id]: event.target.value }))
                  }
                />
                {(note[task.id] || "").trim().length > 0 &&
                (note[task.id] || "").trim().length < 10 ? (
                  <p className={`${ui.small} mt-1.5`}>{t.adminPage.rejectNeedNote}</p>
                ) : null}
                <p className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button className={ui.button} type="button" onClick={() => act(task.id, "accept")}>
                    Accept and publish
                  </button>
                  <Link className={ui.buttonSecondary} href={`/admin/listings/${task.businessId}`}>
                    {t.adminPage.edit}
                  </Link>
                  <button
                    className={ui.buttonSecondary}
                    type="button"
                    disabled={(note[task.id] || "").trim().length < 10}
                    onClick={() => act(task.id, "reject")}
                  >
                    {t.adminPage.reject}
                  </button>
                  <button
                    className={ui.buttonSecondary}
                    type="button"
                    onClick={() => act(task.id, "remove")}
                  >
                    Remove
                  </button>
                </p>
              </article>
            );
          })
        : null}
    </div>
  );
}
