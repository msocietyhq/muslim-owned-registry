"use client";

import { FormEvent, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { GITHUB_SOURCE_URL } from "@/lib/feedback";
import { ui } from "@/lib/ui";

export function FeedbackForm() {
  const { t } = useCopy();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.feedback.fail);
      setSentTo(data.email || email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.feedback.fail);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <p className={ui.notice} role="status">
        {t.feedback.sent.replace("{email}", sentTo)}
      </p>
    );
  }

  return (
    <form className={`${ui.form} max-w-[40rem]`} onSubmit={onSubmit}>
      {error ? <p className={ui.noticeError}>{error}</p> : null}
      <label>
        <span className={ui.label}>{t.feedback.email}</span>
        <p className={`${ui.small} mb-1.5`}>{t.feedback.emailHint}</p>
        <input
          className={ui.input}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        <span className={ui.label}>{t.feedback.message}</span>
        <p className={`${ui.small} mb-1.5`}>{t.feedback.messageHint}</p>
        <textarea
          className={`${ui.textarea} min-h-[160px]`}
          required
          minLength={20}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <label>
        <span className={ui.label}>{t.feedback.prompt}</span>
        <p className={`${ui.small} mb-1.5`}>
          {t.feedback.promptHint}{" "}
          <a className={ui.link} href={GITHUB_SOURCE_URL} rel="noreferrer">
            {t.feedback.github}
          </a>
        </p>
        <textarea
          className={`${ui.textarea} min-h-[180px]`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t.feedback.promptPlaceholder}
        />
      </label>
      <div className="rounded-2xl border border-rule bg-leaf px-4 py-4">
        <p className={`${ui.kicker} mb-2`}>{t.feedback.exampleLabel}</p>
        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/90">
          {t.feedback.example}
        </p>
      </div>
      <p className={ui.small}>{t.feedback.privacy}</p>
      <button className={ui.button} type="submit" disabled={busy}>
        {busy ? t.feedback.sending : t.feedback.submit}
      </button>
    </form>
  );
}
