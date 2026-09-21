import { DirectoryTimeline } from "@/components/directory-timeline";
import { HomeFinder } from "@/components/home-finder";
import { getLiveBusinesses, getTags } from "@/lib/data";
import { foundingSlotsOpen, getFoundingClaimed, homepageFeatureWeight } from "@/lib/founding";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeBusinesses, localizeTags } from "@/lib/localize";
import { shufflePickWeighted } from "@/lib/shuffle";
import { getSearchCount } from "@/lib/stats";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export default async function HomePage() {
  const { lang, t } = await getCopy();
  const [businesses, tags, searchCount, foundingClaimed] = await Promise.all([
    getLiveBusinesses(),
    getTags(),
    getSearchCount(),
    getFoundingClaimed(),
  ]);
  const [shown, shownTags] = await Promise.all([
    localizeBusinesses(businesses, lang),
    localizeTags(tags, lang),
  ]);
  const preview = shufflePickWeighted(shown, 9, (business) => homepageFeatureWeight(business));
  const locale = dateLocale(lang);

  return (
    <div>
      {foundingSlotsOpen(foundingClaimed) ? (
        <div className="border-b border-gold/40 bg-gold px-4 py-3 text-center">
          <p className="font-sans text-sm font-semibold leading-snug text-mihrab sm:text-base">
            {t.home.promo}
          </p>
        </div>
      ) : null}
      <HomeFinder
        preview={preview}
        businesses={shown}
        tags={shownTags}
        locale={locale}
        searchCount={searchCount}
      />
      <div className={ui.shell}>
        <DirectoryTimeline
          title={t.home.howTitle}
          groups={[
            { heading: t.home.howOwnersKicker, steps: t.home.howOwners },
            { heading: t.home.howVisitorsKicker, steps: t.home.howVisitors },
          ]}
        />
      </div>
    </div>
  );
}
