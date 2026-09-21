import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article-body";
import { RegisterListings } from "@/components/register-listings";
import { getArticle, listArticles } from "@/lib/articles";
import { getBusinessesBySlugs } from "@/lib/data";
import { siteUrl } from "@/lib/http";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeArticle, localizeBusinesses } from "@/lib/localize";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export async function generateStaticParams() {
  return listArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article" };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/article/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      publishedTime: article.publishedAt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { lang, t } = await getCopy();
  const original = getArticle(slug);
  if (!original) notFound();
  const article = await localizeArticle(original, lang);
  const businesses = await localizeBusinesses(
    await getBusinessesBySlugs(article.businessSlugs),
    lang,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Organization",
      name: article.author || "muslimowned.sg",
    },
    mainEntityOfPage: `${siteUrl()}/article/${article.slug}`,
    mentions: businesses.map((business) => ({
      "@type": "LocalBusiness",
      name: business.brandName,
      url: `${siteUrl()}/biz/${business.slug}`,
    })),
  };

  return (
    <article className={ui.shell}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className={ui.hero}>
        <p className={ui.kicker}>
          <Link href="/blog" className={ui.link}>
            {t.nav.stories}
          </Link>
          {" · "}
          {new Date(article.publishedAt).toLocaleDateString(dateLocale(lang), {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className={ui.h1Wide}>{article.title}</h1>
        <p className={ui.lede}>{article.description}</p>
      </header>
      <section className={`${ui.section} border-b-0 pb-4`}>
        <ArticleBody content={article.content} />
      </section>
      <RegisterListings businesses={businesses} heading={t.stories.mentioned} demoLabel={t.card.demo} />
    </article>
  );
}
