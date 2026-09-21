import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryTimeline } from "@/components/directory-timeline";
import {
  DeskBrowseShot,
  DeskFormShot,
  DeskSearchShot,
  PhoneBrowseShot,
} from "@/components/product-shots";
import { Reveal } from "@/components/reveal";
import { getLiveBusinesses, getTagMap } from "@/lib/data";
import { getCopy } from "@/lib/lang";
import { localizeBusinesses, localizeTagMap } from "@/lib/localize";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Why list your business",
  description:
    "A public page on muslimowned.sg is free. You can list if the business is at least 51% owned by a Muslim and registered in Singapore with a UEN.",
  alternates: { canonical: "/why" },
};

export default async function WhyListPage() {
  const { lang, t } = await getCopy();
  const [businesses, tags] = await Promise.all([getLiveBusinesses(), getTagMap()]);
  const [featured, tagNames] = await Promise.all([
    localizeBusinesses(businesses.slice(0, 6), lang),
    localizeTagMap(tags, lang),
  ]);
  const shotBusinesses = featured.slice(0, 4).map((item) => ({
    brandName: item.brandName,
    registeredName: item.registeredName,
    summary: item.summary,
    tag: item.tagIds.map((id) => tagNames.get(id)?.name).find(Boolean),
  }));
  const chips = [...tagNames.values()].slice(0, 4).map((tag) => tag.name);
  const searchNames = shotBusinesses.map((item) => item.brandName);

  return (
    <div>
      <section className="relative overflow-hidden bg-mihrab text-paper">
        <div
          className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-[280px] w-[280px] rounded-full bg-jade/30 blur-3xl"
          aria-hidden
        />
        <div
          className={`${ui.shell} relative grid items-center gap-10 py-10 sm:py-16 md:grid-cols-[1.05fr_0.95fr] md:py-20`}
        >
          <div>
            <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-gold">
              {t.why.kicker}
            </p>
            <h1 className="mb-5 max-w-none font-display text-[clamp(1.85rem,8vw,3.6rem)] font-medium leading-[1.12] sm:mb-6 sm:max-w-[18ch]">
              {t.why.title}
            </h1>
            <p className="mb-7 max-w-[54ch] text-base leading-relaxed text-paper/90 sm:mb-8 sm:text-lg">
              {t.why.lead}
            </p>
            <div className={ui.ctaRow}>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold px-5 py-3 font-sans text-base font-semibold text-mihrab no-underline hover:bg-paper sm:w-auto sm:min-h-11 sm:text-sm"
                href="/list-for-free-in-3-minutes"
              >
                {t.why.listCta}
              </Link>
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-paper/40 px-5 py-3 font-sans text-base font-semibold text-paper no-underline hover:bg-paper/10 sm:w-auto sm:min-h-11 sm:text-sm"
                href="/browse"
              >
                {t.home.browseCta}
              </Link>
            </div>
          </div>
          <PhoneBrowseShot
            businesses={shotBusinesses}
            searchPlaceholder={t.browse.searchPlaceholder}
            chips={chips}
          />
        </div>
      </section>

      <section className={ui.shell}>
        <div className={`${ui.section} grid items-center gap-10 lg:grid-cols-2`}>
          <Reveal>
            <h2 className={ui.sectionTitle}>{t.why.visitorsTitle}</h2>
            <div className="grid gap-4">
              {t.why.visitors.map((item, index) => (
                <Reveal key={item.title} delay={index * 90}>
                  <article className={ui.card}>
                    <h3 className="mb-2 font-display text-xl text-mihrab">{item.title}</h3>
                    <p className="leading-relaxed">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <DeskBrowseShot
              businesses={shotBusinesses}
              searchPlaceholder={t.browse.searchPlaceholder}
              chips={chips}
            />
          </Reveal>
        </div>

        <div className={`${ui.section} grid items-center gap-10 border-t border-rule/70 lg:grid-cols-2`}>
          <Reveal className="lg:order-2">
            <h2 className={ui.sectionTitle}>{t.why.ownersTitle}</h2>
            <div className="grid gap-4">
              {t.why.owners.map((item, index) => (
                <Reveal key={item.title} delay={index * 90}>
                  <article className={ui.card}>
                    <h3 className="mb-2 font-display text-xl text-mihrab">{item.title}</h3>
                    <p className="leading-relaxed">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <p className="mt-8">
              <Link className={ui.button} href="/list-for-free-in-3-minutes">
                {t.why.listCta}
              </Link>
            </p>
          </Reveal>
          <Reveal delay={120} className="lg:order-1">
            <DeskFormShot
              title={t.add.title}
              uen={t.add.uen}
              registered={t.add.registered}
              brand={t.add.brand}
              contact={t.add.contact}
              submit={t.add.submit}
            />
          </Reveal>
        </div>

        <div className={`${ui.section} grid items-center gap-10 border-t border-rule/70 lg:grid-cols-2`}>
          <Reveal>
            <h2 className={ui.sectionTitle}>{t.why.planTitle}</h2>
            <p className="mb-6 max-w-[46ch] leading-relaxed">{t.why.planLead}</p>
            <Link className={ui.buttonSecondary} href="/">
              {t.plan.title}
            </Link>
          </Reveal>
          <Reveal delay={140}>
            <DeskSearchShot
              title={t.plan.title}
              placeholder={t.plan.placeholder}
              submit={t.plan.submit}
              groups={[
                {
                  title: t.why.visitors[0]?.title || t.plan.title,
                  names: searchNames.slice(0, 2).length
                    ? searchNames.slice(0, 2)
                    : ["Saffron Kitchen", "Nur Hall"],
                },
              ]}
            />
          </Reveal>
        </div>

        <DirectoryTimeline title={t.why.howTitle} lead={t.why.howLead} steps={t.why.how} />

        <p className={`${ui.section} pt-0`}>
          <Link className={ui.button} href="/list-for-free-in-3-minutes">
            {t.why.listCta}
          </Link>
        </p>
      </section>
    </div>
  );
}
