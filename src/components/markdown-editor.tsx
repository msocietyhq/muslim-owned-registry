"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("@/components/markdown-editor-inner"), {
  ssr: false,
  loading: () => (
    <div className="mosg-mdx mosg-mdx-loading">
      <p>Loading editor…</p>
    </div>
  ),
});

export function MarkdownEditor({
  markdown,
  onChange,
  placeholder,
}: {
  markdown: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return <Inner markdown={markdown} onChange={onChange} placeholder={placeholder} />;
}
