import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/lib/articles";
import { dateLocale } from "@/lib/i18n";
import { getCopy } from "@/lib/lang";
import { localizeArticles } from "@/lib/localize";
import { ui } from "@/lib/ui";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Tips for finding a Muslim-owned business in Singapore, and for listing yours.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const { lang, t } = await getCopy();
  const articles = await localizeArticles(listArticles(), lang);
  return (
    <div className={ui.shell}>
      <section className={ui.hero}>
        <h1 className={ui.h1Wide}>{t.stories.title}</h1>
      </section>
      <section className="pb-16">
        {articles.length === 0 ? (
          <p className={ui.lede}>{t.stories.empty}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {articles.map((article) => (
              <li key={article.slug} className="py-8 first:pt-0">
                <p className={ui.kicker}>
                  {new Date(article.publishedAt).toLocaleDateString(dateLocale(lang), {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <h2 className="mt-2 text-2xl font-medium">
                  <Link href={`/article/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-[62ch] leading-relaxed">{article.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
