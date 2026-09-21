"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { safeAppPath } from "@/lib/app-path";
import { ui } from "@/lib/ui";

const verifying = new Set<string>();

function Verify() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const email = params.get("email");
    const token = params.get("token");
    if (!email || !token) {
      setError("This sign-in link is missing details.");
      return;
    }
    const key = `${email}:${token}`;
    if (verifying.has(key)) return;
    verifying.add(key);
    fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      router.replace(safeAppPath(data.next) || safeAppPath(params.get("next")) || "/app");
      })
      .catch((err) => setError(err.message || "Could not use this link."));
  }, [params, router]);

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>Opening your session</h1>
      {error ? <p className={ui.noticeError}>{error}</p> : <p>One moment…</p>}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
