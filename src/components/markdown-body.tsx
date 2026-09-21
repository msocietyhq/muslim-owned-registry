import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { OutboundLink, type OutboundCopy } from "@/components/outbound-link";
import { ui } from "@/lib/ui";

function safeHref(href?: string) {
  if (!href) return null;
  const trimmed = href.trim();
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return null;
  return trimmed;
}

const components: Components = {
  h1: ({ children }) => <h2 className="mb-3 mt-8 text-2xl font-medium first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-3 mt-8 text-2xl font-medium first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-xl font-medium first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-gold pl-4 text-muted">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-rule" />,
  code: ({ children }) => (
    <code className="rounded bg-leaf px-1.5 py-0.5 font-sans text-[0.92em]">{children}</code>
  ),
  img: () => null,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className={ui.table}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className={ui.th}>{children}</th>,
  td: ({ children }) => <td className={ui.td}>{children}</td>,
  a: ({ href, children }) => {
    const safe = safeHref(href);
    if (!safe) return <span>{children}</span>;
    if (safe.startsWith("/")) {
      return (
        <Link href={safe} className={ui.link}>
          {children}
        </Link>
      );
    }
    return (
      <a href={safe} rel="noreferrer" className={ui.link}>
        {children}
      </a>
    );
  },
};

export function MarkdownBody({
  content,
  className = "max-w-[68ch]",
  outbound,
}: {
  content: string;
  className?: string;
  outbound?: OutboundCopy;
}) {
  if (!content.trim()) return null;
  const markdownComponents: Components = outbound
    ? {
        ...components,
        a: ({ href, children }) => {
          const safe = safeHref(href);
          if (!safe) return <span>{children}</span>;
          if (safe.startsWith("/")) {
            return (
              <Link href={safe} className={ui.link}>
                {children}
              </Link>
            );
          }
          return (
            <OutboundLink href={safe} className={ui.link} copy={outbound}>
              {children}
            </OutboundLink>
          );
        },
      }
    : components;
  return (
    <div className={`mosg-md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ArticleBody({ content }: { content: string }) {
  return <MarkdownBody content={content} />;
}
