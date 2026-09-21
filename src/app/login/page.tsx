"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { safeAppPath } from "@/lib/app-path";
import { ui } from "@/lib/ui";

function LoginForm() {
  const { t } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: params.get("next") || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStage("verify");
      setMessage(
        data.devCode
          ? `Dev mode: your code is ${data.devCode}. A magic link was also created.`
          : t.login.sent,
      );
    } catch {
      setError(t.login.failSend);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(safeAppPath(data.next) || safeAppPath(params.get("next")) || "/app");
      router.refresh();
    } catch {
      setError(t.login.failVerify);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.login.title}</h1>
      <p className="mb-6 leading-relaxed">{t.login.lead}</p>
      {message ? <p className={ui.notice}>{message}</p> : null}
      {error ? <p className={`${ui.noticeError} mt-3`}>{error}</p> : null}

      {stage === "request" ? (
        <form onSubmit={requestCode} className={`${ui.form} mt-4`}>
          <div>
            <label className={ui.label} htmlFor="email">
              {t.login.email}
            </label>
            <input
              className={ui.input}
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className={`${ui.small} mt-1.5`}>{t.login.emailHint}</p>
          </div>
          <button className={ui.button} type="submit" disabled={busy}>
            {busy ? t.login.sending : t.login.send}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className={`${ui.form} mt-4`}>
          <div>
            <label className={ui.label} htmlFor="code">
              {t.login.code}
            </label>
            <input
              className={ui.input}
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>
          <button className={ui.button} type="submit" disabled={busy}>
            {busy ? t.login.verifying : t.login.verify}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
