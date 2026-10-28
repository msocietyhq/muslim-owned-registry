"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCopy } from "@/components/i18n-provider";
import { ui } from "@/lib/ui";

const verifying = new Set<string>();

function Verify() {
  const params = useSearchParams();
  const { t } = useCopy();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const email = params.get("email");
    const token = params.get("token");
    if (!email || !token) {
      setError(t.feedback.verifyMissing);
      return;
    }
    const key = `${email}:${token}`;
    if (verifying.has(key)) return;
    verifying.add(key);
    fetch("/api/feedback", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.feedback.verifyFail);
        setDone(true);
      })
      .catch((err) => setError(err.message || t.feedback.verifyFail));
  }, [params, t.feedback.verifyFail, t.feedback.verifyMissing]);

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.feedback.title}</h1>
      {error ? <p className={ui.noticeError}>{error}</p> : null}
      {!error && done ? <p className={ui.notice}>{t.feedback.verifyOk}</p> : null}
      {!error && !done ? <p>{t.feedback.verifying}</p> : null}
    </div>
  );
}

export default function FeedbackVerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
