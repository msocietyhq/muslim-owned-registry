import { deflateRawSync } from "zlib";
import type { SeoReport } from "@/lib/seo-geo/flow";

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Buffer }[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const compressed = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, compressed);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralStart = offset;
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraph(text: string, bold = false) {
  const weight = bold ? "<w:b/>" : "";
  return `<w:p><w:r><w:rPr>${weight}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function table(headers: string[], rows: string[][]) {
  const cell = (text: string, header = false) =>
    `<w:tc><w:p><w:r><w:rPr>${header ? "<w:b/>" : ""}</w:rPr><w:t>${xml(text)}</w:t></w:r></w:p></w:tc>`;
  const row = (cells: string[], header = false) => `<w:tr>${cells.map((item) => cell(item, header)).join("")}</w:tr>`;
  return `<w:tbl>${row(headers, true)}${rows.map((item) => row(item)).join("")}</w:tbl>`;
}

export function reportDocx(report: SeoReport) {
  const body = [
    paragraph(report.title, true),
    paragraph(report.summary),
    ...report.charts.flatMap((chart) => [
      paragraph(chart.title, true),
      ...chart.bars.map((bar) => paragraph(`${bar.label}: ${bar.value}`)),
    ]),
    ...report.tables.flatMap((item) => [paragraph(item.title, true), table(item.headers, item.rows)]),
    ...report.sections.flatMap((section) => [
      paragraph(section.heading, true),
      ...section.points.map((point) => paragraph(`• ${point}`)),
    ]),
    ...["Month 1", "Month 2", "Month 3"].flatMap((month) => [
      paragraph(month, true),
      ...report.todos
        .filter((todo) => todo.month === month)
        .map((todo) => paragraph(`☐ ${todo.title}. ${todo.detail}`)),
    ]),
  ].join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipStore([
    { name: "[Content_Types].xml", data: Buffer.from(types) },
    { name: "_rels/.rels", data: Buffer.from(rels) },
    { name: "word/document.xml", data: Buffer.from(document) },
  ]);
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width = 90) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function reportPdf(report: SeoReport) {
  const lines: string[] = [report.title, "", report.summary, ""];
  for (const chart of report.charts) {
    lines.push(chart.title);
    const position = /position/i.test(chart.title);
    const max = Math.max(...chart.bars.map((bar) => bar.value), 1);
    for (const bar of chart.bars) {
      const width = Math.max(
        1,
        Math.round(((position ? max - bar.value + 1 : bar.value) / max) * 24),
      );
      lines.push(`${bar.label} ${"#".repeat(width)} ${position ? `position ${bar.value}` : bar.value}`);
    }
    lines.push("");
  }
  for (const item of report.tables) {
    lines.push(item.title, item.headers.join(" | "));
    for (const row of item.rows) lines.push(row.join(" | "));
    lines.push("");
  }
  for (const section of report.sections) {
    lines.push(section.heading);
    for (const point of section.points) lines.push(`- ${point}`);
    lines.push("");
  }
  for (const month of ["Month 1", "Month 2", "Month 3"]) {
    lines.push(month);
    for (const todo of report.todos.filter((item) => item.month === month)) {
      lines.push(`[ ] ${todo.title}. ${todo.detail}`);
    }
    lines.push("");
  }
  const wrapped = lines.flatMap((line) => wrap(line));
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += 46) pages.push(wrapped.slice(index, index + 46));
  if (!pages.length) pages.push([""]);
  const objects: string[] = [];
  const kids: string[] = [];
  pages.forEach((page, pageIndex) => {
    const contentId = 3 + pageIndex * 2;
    const pageId = contentId + 1;
    const commands = page
      .map((line, lineIndex) => `BT /F1 11 Tf 48 ${760 - lineIndex * 16} Td (${pdfEscape(line)}) Tj ET`)
      .join("\n");
    objects[contentId] = `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> >>`;
    kids.push(`${pageId} 0 R`);
  });
  const fontId = 3 + pages.length * 2;
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(" ")}] >>`;
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf);
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
