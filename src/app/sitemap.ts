import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/articles";
import { getLiveBusinesses, getTags } from "@/lib/data";
import { siteUrl } from "@/lib/http";
import { isDemoListing } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [businesses, articles, tags] = await Promise.all([
    getLiveBusinesses(),
    Promise.resolve(listArticles()),
    getTags(),
  ]);
  const staticPages = ["", "/browse", "/why", "/blog", "/plan", "/who-we-are", "/list-for-free-in-3-minutes", "/terms", "/privacy", "/disclaimer"].map(
    (path) => ({
      url: `${base}${path || "/"}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path === "/browse" || path === "/why" || path === "/blog" || path === "/who-we-are" ? 0.8 : 0.5,
    }),
  );
  const listingPages = businesses
    .filter((business) => !isDemoListing(business))
    .map((business) => ({
    url: `${base}/biz/${business.slug}`,
    lastModified: business.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const articlePages = articles.map((article) => ({
    url: `${base}/article/${article.slug}`,
    lastModified: article.updatedAt || article.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const tagPages = tags.map((tag) => ({
    url: `${base}/tags/${tag.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticPages, ...listingPages, ...articlePages, ...tagPages];
}
