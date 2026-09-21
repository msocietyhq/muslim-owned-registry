"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeroSearchDemo } from "@/components/hero-search-demo";
import { ListingCard } from "@/components/listing-card";
import { SmartSearchForm } from "@/components/smart-search-form";
import { useCopy } from "@/components/i18n-provider";
import type { Business, Tag } from "@/lib/types";
import { hasCountedSearch, markCountedSearch, publicSearchCountLabel, withCount } from "@/lib/stats-client";
import { getVisitorId } from "@/lib/visitor-client";
import { ui } from "@/lib/ui";

type Group = {
  title: string;
  reason: string;
  businesses: { slug: string; brandName: string }[];
};

export function HomeFinder({
  preview,
  businesses,
  tags,
  locale,
  searchCount: initialSearchCount,
}: {
  preview: Business[];
  businesses: Business[];
  tags: Tag[];
  locale: string;
  searchCount: number;
}) {
  const { lang, t } = useCopy();
  const [intent, setIntent] = useState("");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchCount, setSearchCount] = useState(initialSearchCount);
  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const bySlug = useMemo(
    () => new Map(businesses.map((item) => [item.slug, item])),
    [businesses],
  );

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.searches === "number") setSearchCount(data.searches);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          lang,
          countSearch: !hasCountedSearch(),
          visitorId: getVisitorId(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      markCountedSearch();
      if (typeof data.searches === "number") setSearchCount(data.searches);
      setGroups(data.groups || []);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setError(t.plan.error);
    } finally {
      setBusy(false);
    }
  }

  const searching = groups !== null;

  return (
    <>
      <section className="relative overflow-hidden bg-mihrab text-paper">
        <div
          className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-[280px] w-[280px] rounded-full bg-jade/30 blur-3xl"
          aria-hidden
        />
        <div className={`${ui.shell} relative grid items-center gap-10 py-10 sm:py-14 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]`}>
          <div>
            <h1 className="mb-4 max-w-none font-display text-[clamp(1.85rem,8vw,3.6rem)] font-medium leading-[1.12] sm:mb-5 sm:max-w-[18ch]">
              {t.home.title}
            </h1>
            <p className="mb-6 max-w-[54ch] text-base leading-relaxed text-paper/90 sm:mb-8 sm:text-lg">
              {t.home.lead} {withCount(t.home.businessesGrowing, businesses.length)}
            </p>
            <div className="max-w-[40rem]">
              <SmartSearchForm
                intent={intent}
                onIntent={setIntent}
                onSubmit={onSubmit}
                busy={busy}
                variant="hero"
                examples={t.home.examples}
                searchCountLabel={publicSearchCountLabel(t.home.searchesCounting, searchCount)}
              />
            </div>
            {error ? <p className={`${ui.noticeError} mt-4 max-w-[40rem]`}>{error}</p> : null}
          </div>
          <div className="hidden lg:block">
            <HeroSearchDemo />
          </div>
        </div>
      </section>

      <section id="results" className={`${ui.shell} ${ui.section} min-w-0`}>
        {searching ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className={`${ui.sectionTitle} mb-0`}>{t.plan.title}</h2>
              <button
                className={`${ui.link} shrink-0 whitespace-nowrap`}
                type="button"
                onClick={() => {
                  setGroups(null);
                  setError("");
                }}
              >
                {t.home.resultsClear}
              </button>
            </div>
            {groups.length === 0 ? (
              <p className="max-w-[54ch] leading-relaxed">{t.plan.empty}</p>
            ) : (
              <div className="grid gap-10">
                {groups.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-4 font-display text-2xl text-mihrab">{group.title}</h3>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.businesses.map((item) => {
                        const business = bySlug.get(item.slug);
                        if (!business) {
                          return (
                            <Link key={item.slug} className={ui.card} href={`/biz/${item.slug}`}>
                              <h3 className="font-display text-xl text-mihrab">{item.brandName}</h3>
                            </Link>
                          );
                        }
                        return (
                          <ListingCard
                            key={business.id}
                            business={business}
                            tags={tagMap}
                            locale={locale}
                            updatedLabel={t.card.updated}
                            demoLabel={t.card.demo}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-2">
              <h2 className="m-0 min-w-0 font-display text-[0.95rem] font-medium leading-snug text-mihrab sm:text-[clamp(1.35rem,4.5vw,2rem)]">
                {t.home.previewTitle}
              </h2>
              <Link
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-leaf px-2.5 py-1 font-sans text-xs font-semibold text-mihrab no-underline hover:bg-paper-2 sm:px-3 sm:py-1.5 sm:text-sm"
                href="/browse"
              >
                {t.home.previewAll}
              </Link>
            </div>
            {preview.length === 0 ? (
              <p className="max-w-[54ch] leading-relaxed">{t.home.previewEmpty}</p>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {preview.map((business) => (
                  <ListingCard
                    key={business.id}
                    business={business}
                    tags={tagMap}
                    locale={locale}
                    updatedLabel={t.card.updated}
                    demoLabel={t.card.demo}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
