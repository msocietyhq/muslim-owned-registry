import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BusinessProfile } from "@/components/business-profile";
import { siteUrl } from "@/lib/http";
import { loadLiveListing } from "@/lib/load-listing";
import { getBusinessBySlug } from "@/lib/data";
import { isDemoListing } from "@/lib/types";
import { markdownPlainText } from "@/lib/markdown";
import { businessPin } from "@/lib/geo";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business || business.status !== "live" || isDemoListing(business)) {
    return { title: "Listing", robots: { index: false, follow: false } };
  }
  const title = `${business.brandName} on muslimowned.sg`;
  const description =
    business.summary ||
    markdownPlainText(business.description || "").slice(0, 160) ||
    `${business.brandName} (${business.registeredName}) is listed on muslimowned.sg so visitors can find and contact this Singapore business.`;
  return {
    title,
    description,
    alternates: { canonical: `/biz/${business.slug}` },
    openGraph: { title, description },
    robots: isDemoListing(business) ? { index: false, follow: false } : undefined,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = await loadLiveListing(slug);
  if (!loaded) notFound();
  const { business, owner, tags, history, verifications, mentionedIn, locale, t } = loaded;
  const pin = businessPin(business);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.brandName,
    legalName: business.registeredName,
    url: `${siteUrl()}/biz/${business.slug}`,
    email: business.contactEmail,
    ...(business.whatsapp ? { telephone: `+${business.whatsapp}` } : {}),
    identifier: business.uen,
    description:
      business.summary ||
      markdownPlainText(business.description || "").slice(0, 280) ||
      `${business.brandName} is listed on muslimowned.sg so visitors can find this Singapore business.`,
    ...(pin
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: pin.lat,
            longitude: pin.lng,
          },
        }
      : {}),
    subjectOf: mentionedIn.map((article) => ({
      "@type": "Article",
      headline: article.title,
      url: `${siteUrl()}/article/${article.slug}`,
    })),
  };

  return (
    <>
      {isDemoListing(business) ? null : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
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
    </>
  );
}
