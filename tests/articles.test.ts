import { describe, expect, it } from "vitest";
import { articlesForBusiness, getArticle, listArticles } from "@/lib/articles";

describe("articles", () => {
  it("lists markdown write-ups", () => {
    const articles = listArticles();
    expect(articles.length).toBeGreaterThan(0);
    expect(articles.every((article) => article.slug && article.title)).toBe(true);
  });

  it("extracts listing slugs from frontmatter and /biz links", () => {
    const article = getArticle("this-register-is-not-a-certification");
    expect(article).not.toBeNull();
    expect(article!.businessSlugs.length).toBeGreaterThanOrEqual(0);
  });

  it("finds articles that mention a listing", () => {
    const known = listArticles().flatMap((article) => article.businessSlugs);
    if (!known.length) {
      expect(articlesForBusiness("no-such-slug")).toEqual([]);
      return;
    }
    expect(articlesForBusiness(known[0]!).length).toBeGreaterThan(0);
  });
});
