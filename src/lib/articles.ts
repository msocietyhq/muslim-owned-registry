import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  businessSlugs: string[];
};

export type Article = ArticleMeta & {
  content: string;
};

const ARTICLES_DIR = path.join(process.cwd(), "content/articles");

function parseBusinessSlugs(value: unknown, markdown: string): string[] {
  const fromFrontmatter = Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const fromLinks = [...markdown.matchAll(/\]\(\/biz\/([a-z0-9-]+)\)/g)].map(
    (match) => match[1],
  );
  return [...new Set([...fromFrontmatter, ...fromLinks])];
}

function readFile(fileName: string): Article | null {
  const filePath = path.join(ARTICLES_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const slug = fileName.replace(/\.mdx?$/, "");
  const title = String(parsed.data.title || slug);
  const description = String(parsed.data.description || title);
  const publishedAt = String(parsed.data.publishedAt || parsed.data.date || "");
  if (!publishedAt) return null;
  return {
    slug,
    title,
    description,
    publishedAt,
    updatedAt: parsed.data.updatedAt ? String(parsed.data.updatedAt) : undefined,
    author: parsed.data.author ? String(parsed.data.author) : undefined,
    businessSlugs: parseBusinessSlugs(parsed.data.businessSlugs, parsed.content),
    content: parsed.content,
  };
}

export function listArticles(): ArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .map((file) => readFile(file))
    .filter((article): article is Article => Boolean(article))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(({ content: _ignored, ...meta }) => meta);
}

export function getArticle(slug: string): Article | null {
  return readFile(`${slug}.md`) || readFile(`${slug}.mdx`);
}

export function articlesForBusiness(slug: string): ArticleMeta[] {
  return listArticles().filter((article) => article.businessSlugs.includes(slug));
}
