"use client";

import type { ReactNode } from "react";
import { parseInline, parseMarkdown, safeHref, type MdInline } from "@/lib/seo-geo/markdown";
import { ui } from "@/lib/ui";

function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        if (node.type === "text") return <span key={key}>{node.text}</span>;
        if (node.type === "strong")
          return (
            <strong key={key} className="font-semibold">
              <Inline nodes={node.children} />
            </strong>
          );
        if (node.type === "em")
          return (
            <em key={key}>
              <Inline nodes={node.children} />
            </em>
          );
        if (node.type === "code")
          return (
            <code key={key} className="rounded bg-leaf px-1.5 py-0.5 font-sans text-[0.92em]">
              {node.text}
            </code>
          );
        const href = safeHref(node.href);
        if (!href) return <span key={key}>{node.children.map((child) => (child.type === "text" ? child.text : "")).join("")}</span>;
        return (
          <a key={key} href={href} rel="noreferrer" className={ui.link}>
            <Inline nodes={node.children} />
          </a>
        );
      })}
    </>
  );
}

function Line({ text }: { text: string }) {
  return <Inline nodes={parseInline(text)} />;
}

export function SeoGeoMarkdown({ content }: { content: string }) {
  if (!content.trim()) return null;
  const blocks = parseMarkdown(content);
  const heading = (level: 1 | 2 | 3, children: ReactNode, key: string) => {
    const className = "mb-3 mt-6 font-medium first:mt-0 " + (level === 3 ? "text-lg" : "text-xl");
    if (level === 3) return <h3 key={key} className={className}>{children}</h3>;
    return (
      <h2 key={key} className={className}>
        {children}
      </h2>
    );
  };
  return (
    <div className="mosg-md max-w-full min-w-0 [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "h") return heading(block.level, <Line text={block.text} />, key);
        if (block.type === "ul")
          return (
            <ul key={key} className="mb-4 list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-relaxed">
                  <Line text={item} />
                </li>
              ))}
            </ul>
          );
        if (block.type === "ol")
          return (
            <ol key={key} className="mb-4 list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="leading-relaxed">
                  <Line text={item} />
                </li>
              ))}
            </ol>
          );
        if (block.type === "quote")
          return (
            <blockquote key={key} className="mb-4 border-l-4 border-gold pl-4 text-muted">
              <Line text={block.text} />
            </blockquote>
          );
        if (block.type === "pre")
          return (
            <pre key={key} className="mb-4 overflow-x-auto rounded-2xl bg-leaf p-3 text-sm">
              {block.text}
            </pre>
          );
        if (block.type === "hr") return <hr key={key} className="my-6 border-rule" />;
        return (
          <p key={key} className="mb-4 leading-relaxed">
            <Line text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
