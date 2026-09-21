import type { Article, ArticleMeta } from "@/lib/articles";
import {
  needsGoogleTranslate,
  translateContent,
  translateMany,
} from "@/lib/google-translate";
import type { Lang } from "@/lib/i18n";
import type { Business, Tag } from "@/lib/types";

export async function localizeBusinesses(businesses: Business[], lang: Lang) {
  if (!needsGoogleTranslate(lang)) return businesses;
  const summaries = await translateMany(
    businesses.map((item) => item.summary || ""),
    lang,
  );
  const descriptions = await Promise.all(
    businesses.map((item) =>
      item.description ? translateContent(item.description, lang) : Promise.resolve(""),
    ),
  );
  return businesses.map((item, index) => ({
    ...item,
    summary: item.summary ? summaries[index] || item.summary : item.summary,
    description: item.description ? descriptions[index] || item.description : item.description,
  }));
}

export async function localizeTags(tags: Tag[], lang: Lang) {
  if (!needsGoogleTranslate(lang)) return tags;
  const names = await translateMany(
    tags.map((tag) => tag.name),
    lang,
  );
  return tags.map((tag, index) => ({ ...tag, name: names[index] || tag.name }));
}

export async function localizeTagMap(tags: Map<string, Tag>, lang: Lang) {
  if (!needsGoogleTranslate(lang)) return tags;
  const localized = await localizeTags([...tags.values()], lang);
  return new Map(localized.map((tag) => [tag.id, tag]));
}

export async function localizeArticle<T extends ArticleMeta | Article>(article: T, lang: Lang) {
  if (!needsGoogleTranslate(lang)) return article;
  const title = await translateContent(article.title, lang);
  const description = await translateContent(article.description, lang);
  if ("content" in article && typeof article.content === "string") {
    const content = await translateContent(article.content, lang);
    return { ...article, title, description, content };
  }
  return { ...article, title, description };
}

export async function localizeArticles<T extends ArticleMeta | Article>(articles: T[], lang: Lang) {
  if (!needsGoogleTranslate(lang)) return articles;
  return Promise.all(articles.map((article) => localizeArticle(article, lang)));
}
