import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { SearchImpressionBeacon } from "@/components/search-impression-beacon";
import { getLiveBusinesses, getTagMap, getTags } from "@/lib/data";
import { extractPlace, formatKm, nearbyBusinesses } from "@/lib/geo";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import {
  listingMatchScore,
  listingMatchesQuery,
  listingTextFields,
  uniqueListings,
} from "@/lib/listing-search";
import { localizeBusinesses, localizeTagMap, localizeTags } from "@/lib/localize";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse businesses",
  description:
    "Browse live Muslim-owned businesses in Singapore. Search by brand, company name, or what you need, and open a public page with contact details.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { lang, t } = await getCopy();
  const { q = "", tag: tagSlug = "" } = await searchParams;
  const [businesses, tags, tagList] = await Promise.all([
    getLiveBusinesses(),
    getTagMap(),
    getTags(),
  ]);
  const query = q.trim().toLowerCase();
  const activeTag = tagList.find((item) => item.slug === tagSlug);
  const tagged = businesses.filter(
    (business) => !activeTag || business.tagIds.includes(activeTag.id),
  );
  const textHits = tagged.filter((business) => {
    if (!query) return true;
    return listingMatchesQuery(
      query,
      listingTextFields({
        brandName: business.brandName,
        registeredName: business.registeredName,
        summary: business.summary,
        description: business.description,
        tags: business.tagIds.map((id) => tags.get(id)?.name || ""),
      }),
    );
  });
  const scoreOf = (business: (typeof tagged)[number]) =>
    listingMatchScore(query, {
      brandName: business.brandName,
      registeredName: business.registeredName,
      summary: business.summary,
      description: business.description,
      tags: business.tagIds.map((id) => tags.get(id)?.name || ""),
    });
  const scoredHits = query
    ? [...textHits].sort((a, b) => scoreOf(b) - scoreOf(a))
    : textHits;
  const place = extractPlace(query);
  const ranked = place
    ? (() => {
        const nearby = nearbyBusinesses(place.point, tagged).sort((a, b) => {
          const scoreDiff = scoreOf(b.item) - scoreOf(a.item);
          if (scoreDiff) return scoreDiff;
          return (a.km ?? 99) - (b.km ?? 99);
        });
        const seen = new Set(nearby.map((row) => row.item.id));
        const extra = scoredHits
          .filter((item) => !seen.has(item.id))
          .map((item) => ({ item, km: null as number | null }));
        return [...nearby, ...extra];
      })()
    : scoredHits.map((item) => ({ item, km: null as number | null }));
  const uniqueRanked = uniqueListings(ranked.map((row) => row.item)).map((item) => {
    const row = ranked.find((entry) => entry.item.id === item.id);
    return row || { item, km: null as number | null };
  });
  const locale = dateLocale(lang);
  const [shownBusinesses, shownTags, shownTagList] = await Promise.all([
    localizeBusinesses(uniqueRanked.map((row) => row.item), lang),
    localizeTagMap(tags, lang),
    localizeTags(tagList, lang),
  ]);
  const shown = uniqueRanked.map((row, index) => ({
    item: shownBusinesses[index] || row.item,
    km: row.km,
  }));

  return (
    <div className={ui.shell}>
      <section className={ui.hero}>
        <h1 className={ui.h1Wide}>{t.browse.title}</h1>
        <p className={ui.lede}>{t.browse.lead}</p>
        <form className={ui.search} action="/browse" method="get">
          {tagSlug ? <input type="hidden" name="tag" value={tagSlug} /> : null}
          <input
            className={ui.input}
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={q}
            placeholder={t.browse.searchPlaceholder}
            aria-label={t.browse.searchLabel}
          />
          <button className={ui.button} type="submit">
            {t.browse.searchButton}
          </button>
        </form>
      </section>

      {shownTagList.length ? (
        <div className="chip-row pb-6">
          <Link
            href={q ? `/browse?q=${encodeURIComponent(q)}` : "/browse"}
            className={`${ui.chip} ${!activeTag ? "bg-mihrab text-paper" : "bg-leaf text-mihrab"}`}
          >
            {t.browse.allTags}
          </Link>
          {shownTagList.map((item) => (
            <Link
              key={item.id}
              href={`/browse?tag=${item.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`${ui.chip} ${
                activeTag?.id === item.id ? "bg-mihrab text-paper" : "bg-leaf text-mihrab"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="pb-16">
        {shown.length === 0 ? (
          <div className={ui.card}>
            <p className="leading-relaxed">
              {businesses.length === 0 ? t.browse.emptyNone : t.browse.emptySearch}
            </p>
            {businesses.length === 0 ? (
              <p className="mt-4">
                <Link className={ui.button} href="/why">
                  {t.nav.why}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {query ? (
              <SearchImpressionBeacon businessIds={shown.map(({ item }) => item.id)} />
            ) : null}
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map(({ item, km }) => (
                <ListingCard
                  key={item.id}
                  business={item}
                  tags={shownTags}
                  locale={locale}
                  updatedLabel={t.card.updated}
                  demoLabel={t.card.demo}
                  distanceLabel={km != null ? formatKm(km, lang) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
