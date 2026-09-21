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

export default function AdminPage() {
  const { t } = useCopy();
  const { user, isAdmin, ready } = useAuthUser();
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

  async function openFile(task: AdminTask) {
    if (!task.uenStoragePath) return;
    const data = await api<{ url: string }>("/api/admin/tasks", {
      method: "POST",
      body: JSON.stringify({ storagePath: task.uenStoragePath }),
    });
    setFileUrl((current) => ({ ...current, [task.id]: data.url }));
  }

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.adminPage.title}</h1>
      <p className={ui.small}>{t.adminPage.lead}</p>
      {error ? <p className={`${ui.noticeError} mt-3`}>{error}</p> : null}
      {isAdminUser ? (
        <p className="mt-6">
          <Link className={ui.buttonSecondary} href="/admin/add-for-others">
            {t.adminPage.addForOthersCta}
          </Link>
        </p>
      ) : null}
      {isAdminUser ? <AdminAccounts /> : null}
      {isAdminUser ? <AdminTeam /> : null}

      <section className="mt-10">
        <h2 className={ui.sectionTitle}>{t.adminPage.visitorsTitle}</h2>
        <p className={`${ui.small} mb-4 max-w-[54ch]`}>{t.adminPage.visitorsLead}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <p className={ui.card}>{withCount(t.adminPage.uniqueVisitors, visitors.uniqueVisitors)}</p>
          <p className={ui.card}>{withCount(t.adminPage.totalVisitors, visitors.totalVisitors)}</p>
        </div>
      </section>

      <section className="mt-10">
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

      {tasks.length === 0 && !error ? (
        <p className={`${ui.small} mt-10`}>{t.adminPage.none}</p>
      ) : null}
      {tasks.map((task) => {
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
      })}
    </div>
  );
}
