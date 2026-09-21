import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/listing-card";
import { getLiveBusinesses, getTagBySlug, getTagMap } from "@/lib/data";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeBusinesses, localizeTagMap } from "@/lib/localize";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Tag" };
  return {
    title: `${tag.name} businesses`,
    description: `Muslim-owned businesses tagged ${tag.name} on muslimowned.sg.`,
    alternates: { canonical: `/tags/${tag.slug}` },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { lang, t } = await getCopy();
  const [tag, businesses, tags] = await Promise.all([
    getTagBySlug(slug),
    getLiveBusinesses(),
    getTagMap(),
  ]);
  if (!tag) notFound();
  const matches = await localizeBusinesses(
    businesses.filter((business) => business.tagIds.includes(tag.id)),
    lang,
  );
  const shownTags = await localizeTagMap(tags, lang);

  return (
    <div className={ui.shell}>
      <section className={ui.hero}>
        <p className={ui.kicker}>{t.tags.kicker}</p>
        <h1 className={ui.h1Wide}>{(shownTags.get(tag.id) || tag).name}</h1>
        <p className={ui.lede}>{t.tags.lead}</p>
      </section>
      <section className="pb-16">
        {matches.length === 0 ? (
          <p className={ui.lede}>{t.tags.empty}</p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((business) => (
              <ListingCard
                key={business.id}
                business={business}
                tags={shownTags}
                locale={dateLocale(lang)}
                updatedLabel={t.card.updated}
                demoLabel={t.card.demo}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
