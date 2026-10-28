export type MdBlock =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "pre"; text: string }
  | { type: "hr" };

export type MdInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MdInline[] }
  | { type: "em"; children: MdInline[] }
  | { type: "code"; text: string }
  | { type: "a"; href: string; children: MdInline[] };

function fenceBlocks(source: string) {
  const parts: Array<{ kind: "pre" | "md"; text: string }> = [];
  const re = /```[^\n]*\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) parts.push({ kind: "md", text: source.slice(last, match.index) });
    parts.push({ kind: "pre", text: (match[1] || "").replace(/\n$/, "") });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ kind: "md", text: source.slice(last) });
  return parts;
}

function headingLevel(line: string): 1 | 2 | 3 | null {
  if (line.startsWith("### ")) return 3;
  if (line.startsWith("## ")) return 2;
  if (line.startsWith("# ")) return 1;
  return null;
}

function parseMdSection(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    const heading = headingLevel(line);
    if (heading) {
      blocks.push({ type: "h", level: heading, text: line.replace(/^#{1,3}\s+/, "") });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quotes: string[] = [];
      while (i < lines.length && (lines[i] || "").startsWith("> ")) {
        quotes.push((lines[i] || "").slice(2));
        i += 1;
      }
      blocks.push({ type: "quote", text: quotes.join(" ") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] || "")) {
        items.push((lines[i] || "").replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] || "")) {
        items.push((lines[i] || "").replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] || "").trim() &&
      !headingLevel(lines[i] || "") &&
      !/^[-*]\s+/.test(lines[i] || "") &&
      !/^\d+\.\s+/.test(lines[i] || "") &&
      !(lines[i] || "").startsWith("> ") &&
      !/^---+$/.test((lines[i] || "").trim())
    ) {
      para.push(lines[i] || "");
      i += 1;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }
  return blocks;
}

export function parseMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  for (const part of fenceBlocks(source.trim())) {
    if (part.kind === "pre") blocks.push({ type: "pre", text: part.text });
    else blocks.push(...parseMdSection(part.text));
  }
  return blocks;
}

function takeUntil(source: string, close: string, from: number) {
  const at = source.indexOf(close, from);
  return at < 0 ? null : { text: source.slice(from, at), next: at + close.length };
}

export function parseInline(source: string): MdInline[] {
  const nodes: MdInline[] = [];
  let i = 0;
  let buffer = "";
  const flush = () => {
    if (buffer) {
      nodes.push({ type: "text", text: buffer });
      buffer = "";
    }
  };
  while (i < source.length) {
    if (source.startsWith("**", i)) {
      const found = takeUntil(source, "**", i + 2);
      if (found) {
        flush();
        nodes.push({ type: "strong", children: parseInline(found.text) });
        i = found.next;
        continue;
      }
    }
    if (source[i] === "*" && source[i + 1] !== "*") {
      const found = takeUntil(source, "*", i + 1);
      if (found) {
        flush();
        nodes.push({ type: "em", children: parseInline(found.text) });
        i = found.next;
        continue;
      }
    }
    if (source[i] === "`") {
      const found = takeUntil(source, "`", i + 1);
      if (found) {
        flush();
        nodes.push({ type: "code", text: found.text });
        i = found.next;
        continue;
      }
    }
    if (source[i] === "[") {
      const labelEnd = source.indexOf("](", i);
      const hrefEnd = labelEnd >= 0 ? source.indexOf(")", labelEnd + 2) : -1;
      if (labelEnd > i && hrefEnd > labelEnd) {
        flush();
        nodes.push({
          type: "a",
          href: source.slice(labelEnd + 2, hrefEnd),
          children: parseInline(source.slice(i + 1, labelEnd)),
        });
        i = hrefEnd + 1;
        continue;
      }
    }
    buffer += source[i];
    i += 1;
  }
  flush();
  return nodes;
}

export function safeHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed || /^(javascript|vbscript|data):/i.test(trimmed)) return null;
  return trimmed;
}
