"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { ui } from "@/lib/ui";

const verifying = new Set<string>();

function Verify() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useCopy();
  const [error, setError] = useState("");

  useEffect(() => {
    const email = params.get("email");
    const token = params.get("token");
    if (!email || !token) {
      setError(t.quickList.verifyMissing);
      return;
    }
    const key = `${email}:${token}`;
    if (verifying.has(key)) return;
    verifying.add(key);
    fetch("/api/list-quick", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.quickList.failVerify);
        router.replace("/app?submitted=1");
      })
      .catch((err) => setError(err.message || t.quickList.failVerify));
  }, [params, router, t.quickList.failVerify, t.quickList.verifyMissing]);

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.quickList.title}</h1>
      {error ? <p className={ui.noticeError}>{error}</p> : <p>{t.quickList.verifyingLink}</p>}
    </div>
  );
}

export default function ListQuickVerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
