"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SeoGeoJourney } from "@/components/seo-geo-journey";
import { api } from "@/lib/api-client";
import type { SeoAnswer, SeoPhase, SeoQuestion, SeoReport } from "@/lib/seo-geo/flow";
import { useAuthUser } from "@/lib/use-auth-user";
import { ui } from "@/lib/ui";

type Domain = { domain: string; businessId: string; brandName: string };
type Chat = {
  id: string;
  domain: string;
  phase: SeoPhase;
  workStatus: "idle" | "queued" | "running";
  workingNote: string;
  lastError?: string;
  questions: SeoQuestion[];
  report: SeoReport | null;
  activity?: { at: string; text: string }[];
};

function Spinner() {
  return (
    <span className="mt-1 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-mihrab/20 border-t-mihrab" aria-hidden />
  );
}

export function SeoGeoChat() {
  const { ready } = useAuthUser();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domain, setDomain] = useState("");
  const [chat, setChat] = useState<Chat | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const waiting = chat?.workStatus === "queued" || chat?.workStatus === "running";

  async function openSite(nextDomain: string) {
    if (!nextDomain) return;
    const data = await api<{ chat: Chat }>("/api/tools/seo-geo", {
      method: "POST",
      body: JSON.stringify({ domain: nextDomain }),
    });
    const thread = await api<{ chat: Chat }>(`/api/tools/seo-geo/${data.chat.id}`);
    setChat(thread.chat);
  }

  useEffect(() => {
    if (!ready) return;
    api<{ domains: Domain[] }>("/api/tools/seo-geo")
      .then((data) => {
        setDomains(data.domains);
        setDomain((current) => current || data.domains[0]?.domain || "");
      })
      .catch(() => setError("Could not load your tools."))
      .finally(() => setLoaded(true));
  }, [ready]);

  useEffect(() => {
    if (!loaded || !domain) return;
    openSite(domain).catch(() => setError("Could not open this website."));
  }, [loaded, domain]);

  useEffect(() => {
    if (!chat?.id || !waiting) return;
    const timer = window.setInterval(() => {
      void api<{ chat: Chat }>(`/api/tools/seo-geo/${chat.id}`)
        .then((thread) => setChat(thread.chat))
        .catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [chat?.id, waiting]);

  async function proceed() {
    if (!chat?.id || waiting) return;
    setBusy(true);
    setError("");
    setChat({ ...chat, workStatus: "queued", phase: "gathering", workingNote: "Queued. Waiting for a free worker." });
    try {
      await api(`/api/tools/seo-geo/${chat.id}/proceed`, { method: "POST" });
      const thread = await api<{ chat: Chat }>(`/api/tools/seo-geo/${chat.id}`);
      setChat(thread.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start.");
    } finally {
      setBusy(false);
    }
  }

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function sendAnswers() {
    if (!chat) return;
    const payload: SeoAnswer[] = chat.questions.map((question) => ({
      id: question.id,
      value: answers[question.id] || (question.kind === "multi" ? [] : ""),
    }));
    setBusy(true);
    setError("");
    try {
      await api(`/api/tools/seo-geo/${chat.id}/answers`, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      const thread = await api<{ chat: Chat }>(`/api/tools/seo-geo/${chat.id}`);
      setChat(thread.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the answers.");
    } finally {
      setBusy(false);
    }
  }

  async function resetChats() {
    setConfirmReset(false);
    setBusy(true);
    try {
      await api("/api/tools/seo-geo/reset", { method: "POST" });
      setChat(null);
      setAnswers({});
      if (domain) await openSite(domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !loaded) {
    return (
      <div className={`${ui.shell} ${ui.section}`}>
        <p>Loading…</p>
      </div>
    );
  }

  const report = chat?.report;

  return (
    <div className={`${ui.shell} ${ui.section} min-w-0 max-w-full overflow-x-clip`}>
      <p className={ui.kicker}>SEO & GEO</p>
      <h1 className={ui.h1Wide}>Website search report</h1>
      <p className="mb-6">
        <Link className={ui.link} href="/tools">
          All tools
        </Link>
      </p>
      {error ? <p className={`${ui.noticeError} mb-4`}>{error}</p> : null}
      {domains.length === 0 ? (
        <p className={ui.notice}>Needs a live listing with a company website.</p>
      ) : (
        <div className="grid min-w-0 gap-5">
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label className={`${ui.label} mb-0`} htmlFor="seo-domain">
                Website
              </label>
              <button
                className="shrink-0 font-sans text-sm font-semibold text-jade underline decoration-jade/30 underline-offset-2"
                type="button"
                onClick={() => setConfirmReset(true)}
              >
                Reset
              </button>
            </div>
            <select id="seo-domain" className={`${ui.input} max-w-full`} value={domain} onChange={(event) => setDomain(event.target.value)}>
              {domains.map((row) => (
                <option key={`${row.businessId}-${row.domain}`} value={row.domain}>
                  {row.domain} · {row.brandName}
                </option>
              ))}
            </select>
          </div>
          <SeoGeoJourney phase={chat?.phase || "intro"} />
          {waiting ? (
            <div className={ui.card} role="status">
              <ol className="grid gap-1.5">
                {(chat?.activity?.length ? chat.activity.slice(-8) : [{ at: "now", text: chat?.workingNote || "Working…" }]).map(
                  (row, index, rows) => (
                    <li key={`${row.at}-${index}`} className={`flex gap-2 ${index === rows.length - 1 ? "font-semibold text-mihrab" : "text-muted"}`}>
                      {index === rows.length - 1 ? <Spinner /> : <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-jade/50" />}
                      <span>{row.text}</span>
                    </li>
                  ),
                )}
              </ol>
            </div>
          ) : null}
          {chat?.lastError && !waiting ? <p className={ui.noticeError}>{chat.lastError}</p> : null}
          {!waiting && (chat?.phase === "intro" || !chat?.phase) ? (
            <section className={ui.card}>
              <h2 className="font-display text-2xl text-mihrab">Check this website</h2>
              <p className="mt-3 leading-relaxed">
                We open the site and read the sitemap. Then you complete the business-and-buyer worksheet. The report follows that method, for whatever market those buyers are in.
              </p>
              <button className={`${ui.button} mt-5`} type="button" disabled={!chat || busy} onClick={() => void proceed()}>
                Proceed
              </button>
            </section>
          ) : null}
          {!waiting && chat?.phase === "questions" ? (
            <form
              className={ui.card}
              onSubmit={(event) => {
                event.preventDefault();
                void sendAnswers();
              }}
            >
              <h2 className="font-display text-2xl text-mihrab">Business and buyer worksheet</h2>
              <ol className="mt-5 grid gap-5">
                {chat.questions.map((question, index) => (
                  <li key={question.id}>
                    <p className="font-semibold">
                      {index + 1}. {question.prompt}
                    </p>
                    {question.kind === "text" ? (
                      <textarea
                        className={`${ui.textarea} mt-2`}
                        value={String(answers[question.id] || "")}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                    ) : (
                      <div className="mt-2 grid gap-2">
                        {question.options.map((option) => {
                          const selected = answers[question.id];
                          const checked = Array.isArray(selected) ? selected.includes(option) : selected === option;
                          return (
                            <label key={option} className={ui.checkbox}>
                              <input
                                className={ui.check}
                                type={question.kind === "multi" ? "checkbox" : "radio"}
                                name={question.id}
                                checked={checked}
                                onChange={() => {
                                  if (question.kind === "multi") {
                                    const current = Array.isArray(selected) ? selected : [];
                                    setAnswer(
                                      question.id,
                                      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
                                    );
                                  } else setAnswer(question.id, option);
                                }}
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
              <button className={`${ui.button} mt-5`} type="submit" disabled={busy}>
                Build the report
              </button>
            </form>
          ) : null}
          {!waiting && chat?.phase === "report" && report ? (
            <article className={`${ui.card} grid gap-6`}>
              <header>
                <h2 className="font-display text-2xl text-mihrab">{report.title}</h2>
                <p className="mt-3 leading-relaxed">{report.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a className={ui.button} href={`/api/tools/seo-geo/${chat.id}/file?format=docx`}>
                    Download Word
                  </a>
                  <a className={ui.buttonSecondary} href={`/api/tools/seo-geo/${chat.id}/file?format=pdf`}>
                    Download PDF
                  </a>
                </div>
              </header>
              {report.charts.map((chart) => {
                const position = /position/i.test(chart.title);
                const max = Math.max(...chart.bars.map((bar) => bar.value), 1);
                return (
                  <section key={chart.title}>
                    <h3 className="font-semibold text-mihrab">{chart.title}</h3>
                    {position ? <p className="mt-1 text-sm text-muted">A smaller number is closer to the top.</p> : null}
                    <ul className="mt-3 grid gap-2">
                      {chart.bars.map((bar) => (
                        <li key={bar.label}>
                          <div className="mb-1 flex justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate">{bar.label}</span>
                            <span>{bar.value.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-leaf">
                            <div
                              className="h-2 rounded-full bg-mihrab"
                              style={{
                                width: `${Math.max(4, ((position ? max - bar.value + 1 : bar.value) / max) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {report.tables.map((table) => (
                <section key={table.title} className="min-w-0 overflow-x-auto">
                  <h3 className="mb-2 font-semibold text-mihrab">{table.title}</h3>
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        {table.headers.map((header) => (
                          <th key={header} className={ui.th}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, index) => (
                        <tr key={index}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={ui.td}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
              {report.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="font-semibold text-mihrab">{section.heading}</h3>
                  <ul className="mt-2 grid gap-2">
                    {(section.points?.length ? section.points : []).map((point) => (
                      <li key={point} className="flex gap-2 leading-snug">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-jade" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <section>
                <h3 className="font-semibold text-mihrab">Three-month checklist</h3>
                {["Month 1", "Month 2", "Month 3"].map((month) => (
                  <div key={month} className="mt-4">
                    <h4 className="font-sans text-sm font-semibold uppercase tracking-[0.08em] text-jade">{month}</h4>
                    <ul className="mt-2 grid gap-2">
                      {report.todos
                        .filter((todo) => (todo.month || "Month 1") === month)
                        .map((todo) => {
                          const key = `${month}-${todo.title}`;
                          return (
                            <li key={key}>
                              <label className={ui.checkbox}>
                                <input
                                  className={ui.check}
                                  type="checkbox"
                                  checked={Boolean(checked[key])}
                                  onChange={() => setChecked((current) => ({ ...current, [key]: !current[key] }))}
                                />
                                <span>
                                  <span className="font-semibold">{todo.title}</span>
                                  <span className="mt-0.5 block text-sm leading-snug text-muted">{todo.detail}</span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </section>
            </article>
          ) : null}
        </div>
      )}
      {confirmReset ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Keep report" onClick={() => setConfirmReset(false)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-t-[1.5rem] bg-paper p-5 shadow-2xl sm:rounded-[1.5rem]">
            <h2 className="font-display text-xl text-mihrab">Reset this report?</h2>
            <p className="mt-3 leading-relaxed">This clears the check, the answers, and the report for your websites.</p>
            <div className={`${ui.ctaRow} mt-6`}>
              <button className={ui.button} type="button" onClick={() => void resetChats()}>
                Reset
              </button>
              <button className={ui.buttonSecondary} type="button" onClick={() => setConfirmReset(false)}>
                Keep it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
