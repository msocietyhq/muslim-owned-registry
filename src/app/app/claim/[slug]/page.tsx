"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { TERMS_CLAUSE_COUNT, termsClauses } from "@/lib/legal";
import { ui } from "@/lib/ui";

export default function ClaimListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { lang, t } = useCopy();
  const { user, ready } = useAuthUser({ loginRedirect: false });
  const clauses = termsClauses(lang);
  const [brandName, setBrandName] = useState("");
  const [needsTerms, setNeedsTerms] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/app/claim/${slug}`)}`);
      return;
    }
    let cancelled = false;
    api<{
      brandName: string;
      needsTerms: boolean;
      alreadyClaimed: boolean;
      businessId: string | null;
    }>(`/api/listings/claim?slug=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        if (data.alreadyClaimed && data.businessId) {
          router.replace(`/app/businesses/${data.businessId}`);
          return;
        }
        setBrandName(data.brandName);
        setNeedsTerms(data.needsTerms);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || t.unclaimed.fail);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, slug, router, t.unclaimed.fail]);

  async function claim() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ businessId: string }>(`/api/listings/claim`, {
        method: "POST",
        body: JSON.stringify({
          slug,
          acceptTerms: needsTerms ? true : undefined,
          acceptedClauseCount: needsTerms ? TERMS_CLAUSE_COUNT : undefined,
          termsCopy: needsTerms ? clauses.join("\n") : undefined,
        }),
      });
      router.replace(`/app/businesses/${result.businessId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unclaimed.fail);
      setBusy(false);
    }
  }

  return (
    <main className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.unclaimed.title}</h1>
      <p className={ui.lede}>
        {brandName ? `${brandName}. ` : ""}
        {t.unclaimed.done}
      </p>
      {needsTerms ? (
        <label className={`${ui.checkbox} mb-6 max-w-[62ch]`}>
          <input
            className={ui.check}
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            {clauses[0]}{" "}
            <Link className={ui.link} href="/terms">
              {t.footer.terms}
            </Link>
          </span>
        </label>
      ) : null}
      {error ? <p className={`${ui.noticeError} mb-4 max-w-[62ch]`}>{error}</p> : null}
      <button
        className={ui.button}
        type="button"
        disabled={busy || !brandName || (needsTerms && !accepted)}
        onClick={claim}
      >
        {busy ? t.unclaimed.busy : t.unclaimed.claimNow}
      </button>
    </main>
  );
}
