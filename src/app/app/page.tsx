"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCopy } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { OwnerListingStats } from "@/components/owner-listing-stats";
import type { Business, ListingStats } from "@/lib/types";
import { isDemoListing } from "@/lib/types";
import { badgeTone, ui } from "@/lib/ui";
import { DemoBadge } from "@/components/demo-badge";

function DashboardInner() {
  const { t } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const { user, ready: authReady } = useAuthUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<Record<string, ListingStats>>({});
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [receiptNotice, setReceiptNotice] = useState(false);

  useEffect(() => {
    if (params.get("submitted") === "1") {
      setReceiptNotice(true);
      router.replace("/app");
    }
  }, [params, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{
          businesses: Business[];
          stats?: Record<string, ListingStats>;
        }>("/api/businesses");
        if (cancelled) return;
        setBusinesses(data.businesses);
        setStats(data.stats || {});
        const reconfirm = params.get("reconfirm");
        if (reconfirm) {
          await api("/api/businesses", {
            method: "PATCH",
            body: JSON.stringify({ id: reconfirm, action: "reconfirm" }),
          });
          const refreshed = await api<{
            businesses: Business[];
            stats?: Record<string, ListingStats>;
          }>("/api/businesses");
          if (cancelled) return;
          setBusinesses(refreshed.businesses);
          setStats(refreshed.stats || {});
        }
      } catch {
        if (!cancelled) setError(t.app.loadError);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, t.app.loadError, user]);

  async function unpublish(id: string) {
    await api("/api/businesses", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "unpublish" }),
    });
    const data = await api<{
      businesses: Business[];
      stats?: Record<string, ListingStats>;
    }>("/api/businesses");
    setBusinesses(data.businesses);
    setStats(data.stats || {});
  }

  async function reconfirm(id: string) {
    await api("/api/businesses", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "reconfirm" }),
    });
    const data = await api<{
      businesses: Business[];
      stats?: Record<string, ListingStats>;
    }>("/api/businesses");
    setBusinesses(data.businesses);
    setStats(data.stats || {});
  }

  if (!authReady || !ready) {
    return (
      <div className={`${ui.shell} ${ui.section}`}>
        <p>{t.app.loading}</p>
      </div>
    );
  }

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.app.title}</h1>
      <p className="mb-6 max-w-[54ch] leading-relaxed">{t.app.lead}</p>
      {receiptNotice ? <p className={`${ui.notice} mb-6`}>{t.app.receiptNotice}</p> : null}
      <p>
        <Link className={ui.button} href="/app/businesses/new">
          {t.app.add}
        </Link>
      </p>
      {error ? <p className={`${ui.noticeError} mt-3`}>{error}</p> : null}
      {businesses.length === 0 ? (
        <p className="mt-6 max-w-[54ch] leading-relaxed">{t.app.empty}</p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {businesses.map((business) => (
            <li key={business.id} className={ui.card}>
              <h2 className="font-display text-2xl text-mihrab [overflow-wrap:anywhere]">
                {business.status === "live" ? (
                  <Link href={`/biz/${business.slug}`} className="hover:underline">
                    {business.brandName}
                  </Link>
                ) : (
                  business.brandName
                )}
              </h2>
              <p className={`${ui.small} mt-1`}>{business.registeredName}</p>
              <span className={`${ui.badge} ${badgeTone(business.status)} mt-3`}>
                {(t.status as Record<string, string>)[business.status] ||
                  business.status.replace(/_/g, " ")}
              </span>
              {business.status === "pending_review" ? (
                <p className={`${ui.small} mt-3 max-w-[54ch]`}>
                  {t.app.pendingMail.replace("{email}", business.contactEmail)}
                </p>
              ) : null}
              {business.status === "draft" && business.lastAdminNote ? (
                <div className={`${ui.noticeError} mt-3`}>
                  <p className="font-semibold">{t.app.rejectedLead}</p>
                  <p className="mt-2 whitespace-pre-wrap">{business.lastAdminNote}</p>
                </div>
              ) : null}
              {isDemoListing(business) ? (
                <span className="ml-2">
                  <DemoBadge label={t.card.demo} />
                </span>
              ) : null}
              <OwnerListingStats stats={stats[business.id]} />
              <div className={`${ui.ctaRow} mt-4`}>
                <Link
                  className={business.status === "draft" ? ui.button : ui.buttonSecondary}
                  href={`/app/businesses/${business.id}`}
                >
                  {business.status === "draft" ? t.app.resubmit : t.app.edit}
                </Link>
                {business.status === "live" ? (
                  <button
                    className={ui.buttonSecondary}
                    type="button"
                    onClick={() => unpublish(business.id)}
                  >
                    {t.app.unpublish}
                  </button>
                ) : null}
                {business.status === "unpublished" || business.status === "pending_activation" ? (
                  <button
                    className={ui.button}
                    type="button"
                    onClick={() => reconfirm(business.id)}
                  >
                    {t.app.reconfirm}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
