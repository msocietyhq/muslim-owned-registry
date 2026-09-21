import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusinessesByOwner, getOwnerBySlug, getTagMap } from "@/lib/data";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeBusinesses, localizeTagMap } from "@/lib/localize";
import { ui } from "@/lib/ui";
import { ListingCard } from "@/components/listing-card";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const owner = await getOwnerBySlug(slug);
  if (!owner) return { title: "Owner" };
  return {
    title: `${owner.displayName} on muslimowned.sg`,
    description: `Live businesses listed by ${owner.displayName} on muslimowned.sg.`,
    alternates: { canonical: `/owner/${owner.slug}` },
  };
}

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { lang, t } = await getCopy();
  const owner = await getOwnerBySlug(slug);
  if (!owner) notFound();
  const businesses = await localizeBusinesses(
    await getBusinessesByOwner(owner.id, true),
    lang,
  );
  const tags = await localizeTagMap(await getTagMap(), lang);

  return (
    <div className={ui.shell}>
      <section className={ui.hero}>
        <p className={ui.kicker}>{t.owner.kicker}</p>
        <h1 className={ui.h1Wide}>{owner.displayName}</h1>
        <p className={ui.lede}>{t.owner.lead}</p>
      </section>
      <section className="pb-16">
        {businesses.length === 0 ? (
          <p className={ui.lede}>{t.owner.empty}</p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <ListingCard
                key={business.id}
                business={business}
                tags={tags}
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
