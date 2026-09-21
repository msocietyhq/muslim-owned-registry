import { ListingModal } from "@/components/listing-modal";
import { BusinessProfile } from "@/components/business-profile";
import { loadLiveListing } from "@/lib/load-listing";

export default async function InterceptedBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = await loadLiveListing(slug);
  if (!loaded) return null;
  const { business, owner, tags, history, verifications, mentionedIn, locale, t } = loaded;
  return (
    <ListingModal title={business.brandName} closeLabel={t.biz.close}>
      <BusinessProfile
        business={business}
        owner={owner}
        tags={tags}
        history={history}
        verifications={verifications}
        mentionedIn={mentionedIn}
        locale={locale}
        t={t}
      />
    </ListingModal>
  );
}
