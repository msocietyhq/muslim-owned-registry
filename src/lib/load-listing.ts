import { articlesForBusiness } from "@/lib/articles";
import { getBusinessBySlug, getOwner, getTagMap, getVerifications } from "@/lib/data";
import { listHistory } from "@/lib/history";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeArticles, localizeBusinesses, localizeTagMap } from "@/lib/localize";
import { isDemoListing } from "@/lib/types";

export async function loadLiveListing(slug: string) {
  const found = await getBusinessBySlug(slug);
  if (!found || found.status !== "live" || isDemoListing(found)) return null;
  const { lang, t } = await getCopy();
  const [owner, tags, history, verifications, mentionedIn, localized] = await Promise.all([
    getOwner(found.ownerId),
    localizeTagMap(await getTagMap(), lang),
    listHistory("businesses", found.id).then((rows) =>
      rows.map((row) => {
        const item = row as {
          id: string;
          op?: string;
          createdAt?: string;
          snapshot?: Record<string, unknown>;
          actorId?: string | null;
          actorEmail?: string | null;
          actorName?: string | null;
          actorRole?: string | null;
        };
        return {
          id: item.id,
          op: item.op || "update",
          createdAt: item.createdAt || "",
          snapshot: item.snapshot,
          actorId: item.actorId || null,
          actorEmail: item.actorEmail || null,
          actorName: item.actorName || null,
          actorRole: item.actorRole || null,
        };
      }),
    ),
    getVerifications(found.id),
    localizeArticles(articlesForBusiness(found.slug), lang),
    localizeBusinesses([found], lang),
  ]);
  return {
    business: localized[0] || found,
    owner,
    tags,
    history,
    verifications,
    mentionedIn,
    locale: dateLocale(lang),
    t,
  };
}
