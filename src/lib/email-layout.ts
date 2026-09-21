import { siteUrl } from "@/lib/http";
import type { ListingStats } from "@/lib/types";

export const EMAIL_COLORS = {
  paper: "#f4efe4",
  surface: "#fffdf8",
  mihrab: "#0c3f32",
  jade: "#1a7a57",
  gold: "#c4a35a",
  ink: "#122821",
  muted: "#5a6d64",
  leaf: "#e4f2ea",
  rule: "#d6c7a0",
};

export type EmailStat = {
  value: number;
  label: string;
};

export type EmailDetailRow = {
  label: string;
  value: string;
};

export type EmailSection = {
  title: string;
  rows?: EmailDetailRow[];
  quote?: string;
  note?: string;
};

export type SiteEmailContent = {
  preheader?: string;
  kicker?: string;
  heading: string;
  intro: string[];
  highlight?: string;
  highlightHint?: string;
  stats?: EmailStat[];
  statsNote?: string;
  sections?: EmailSection[];
  cta?: { href: string; label: string };
  outro?: string[];
  footer?: string;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEmailCount(n: number) {
  const value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return new Intl.NumberFormat("en-SG").format(value);
}

export function hasListingTraffic(stats?: ListingStats | null) {
  if (!stats) return false;
  return stats.uniqueViews > 0 || stats.uniqueImpressions > 0 || stats.clicks > 0;
}

export function listingEmailStats(stats?: ListingStats | null): EmailStat[] {
  const uniqueViews = stats?.uniqueViews ?? 0;
  const uniqueImpressions = stats?.uniqueImpressions ?? 0;
  const clicks = stats?.clicks ?? 0;
  return [
    { value: uniqueViews, label: "unique people opened your page" },
    { value: uniqueImpressions, label: "unique people saw you in search" },
    { value: clicks, label: "times your page was opened" },
  ];
}

export function listingStatsText(stats?: ListingStats | null) {
  if (!hasListingTraffic(stats)) {
    return "Your public page is ready for visitors. Confirm it stays live so people can keep finding you.";
  }
  return listingEmailStats(stats)
    .map((item) => `${formatEmailCount(item.value)} ${item.label}.`)
    .join(" ");
}

export function renderSiteEmail(content: SiteEmailContent) {
  const origin = siteUrl();
  const logo = `${origin}/logo.png`;
  const preheader = content.preheader || content.intro[0] || content.heading;
  const kicker = content.kicker || "muslimowned.sg";
  const footer =
    content.footer ||
    "muslimowned.sg is a free directory of Muslim-owned businesses in Singapore.";

  const introHtml = content.intro
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:${EMAIL_COLORS.ink};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const outroHtml = (content.outro || [])
    .map(
      (paragraph) =>
        `<p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:${EMAIL_COLORS.ink};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const statsHtml = renderStatsTable(content.stats, content.statsNote);
  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
        <tr>
          <td style="background:${EMAIL_COLORS.mihrab};border-radius:999px;">
            <a href="${escapeHtml(content.cta.href)}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${EMAIL_COLORS.paper};text-decoration:none;">${escapeHtml(content.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.paper};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="background:${EMAIL_COLORS.mihrab};border-radius:24px 24px 0 0;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${escapeHtml(logo)}" width="40" height="40" alt="" style="display:block;border-radius:20px;border:0;">
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:${EMAIL_COLORS.paper};">muslimowned.sg</p>
                    <p style="margin:6px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_COLORS.gold};">${escapeHtml(kicker)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_COLORS.surface};padding:32px;border-left:1px solid ${EMAIL_COLORS.rule};border-right:1px solid ${EMAIL_COLORS.rule};">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:${EMAIL_COLORS.mihrab};">${escapeHtml(content.heading)}</h1>
              ${introHtml}
              ${renderHighlight(content.highlight, content.highlightHint)}
              ${statsHtml}
              ${renderSections(content.sections)}
              ${ctaHtml}
              ${outroHtml}
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_COLORS.mihrab};border-radius:0 0 24px 24px;padding:20px 32px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:${EMAIL_COLORS.paper};">${escapeHtml(footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderSiteEmailText(content: SiteEmailContent) {
  const lines = [
    content.heading,
    "",
    ...content.intro,
  ];
  if (content.highlight) {
    lines.push("", content.highlight);
    if (content.highlightHint) lines.push(content.highlightHint);
  }
  if (content.stats?.length) {
    lines.push("", "How people found you");
    for (const stat of content.stats) {
      lines.push(`${formatEmailCount(stat.value)} ${stat.label}`);
    }
    if (content.statsNote) lines.push(content.statsNote);
  }
  for (const section of content.sections || []) {
    lines.push("", section.title);
    for (const row of section.rows || []) {
      lines.push(`${row.label}: ${row.value}`);
    }
    if (section.quote) {
      lines.push("", section.quote);
    }
    if (section.note) lines.push(section.note);
  }
  if (content.cta) {
    lines.push("", content.cta.label, content.cta.href);
  }
  if (content.outro?.length) {
    lines.push("", ...content.outro);
  }
  lines.push(
    "",
    content.footer ||
      "muslimowned.sg is a free directory of Muslim-owned businesses in Singapore.",
  );
  return `${lines.join("\n")}\n`;
}

function renderSections(sections?: EmailSection[]) {
  if (!sections?.length) return "";
  return sections
    .map((section) => {
      const rows = (section.rows || [])
        .map(
          (row) => `<tr>
            <td style="padding:0 0 14px;">
              <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${EMAIL_COLORS.jade};font-weight:700;">${escapeHtml(row.label)}</p>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:${EMAIL_COLORS.ink};white-space:pre-wrap;">${escapeHtml(row.value)}</p>
            </td>
          </tr>`,
        )
        .join("");
      const quote = section.quote
        ? `<tr>
            <td style="padding:4px 0 14px;">
              <div style="background:${EMAIL_COLORS.leaf};border:1px solid ${EMAIL_COLORS.rule};border-radius:16px;padding:16px 18px;">
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.ink};white-space:pre-wrap;">${escapeHtml(section.quote)}</p>
              </div>
            </td>
          </tr>`
        : "";
      const note = section.note
        ? `<tr>
            <td style="padding:0 0 8px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">${escapeHtml(section.note)}</p>
            </td>
          </tr>`
        : "";
      return `<p style="margin:28px 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${EMAIL_COLORS.jade};font-weight:700;">${escapeHtml(section.title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${quote}${note}</table>`;
    })
    .join("");
}

function renderHighlight(value?: string, hint?: string) {
  if (!value) return "";
  const hintHtml = hint
    ? `<p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${EMAIL_COLORS.muted};">${escapeHtml(hint)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
    <tr>
      <td style="background:${EMAIL_COLORS.leaf};border:1px solid ${EMAIL_COLORS.rule};border-radius:16px;padding:22px 16px;text-align:center;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;letter-spacing:0.18em;line-height:1;color:${EMAIL_COLORS.mihrab};font-weight:700;">${escapeHtml(value)}</p>
        ${hintHtml}
      </td>
    </tr>
  </table>`;
}

function renderStatsTable(stats?: EmailStat[], note?: string) {
  if (!stats?.length) return "";
  const rows = stats
    .map(
      (stat) => `<tr>
        <td style="padding:14px 16px;background:${EMAIL_COLORS.leaf};border:1px solid ${EMAIL_COLORS.rule};border-radius:16px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;color:${EMAIL_COLORS.mihrab};">${formatEmailCount(stat.value)}</p>
          <p style="margin:6px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;color:${EMAIL_COLORS.muted};">${escapeHtml(stat.label)}</p>
        </td>
      </tr>
      <tr><td style="height:10px;font-size:10px;line-height:10px;">&nbsp;</td></tr>`,
    )
    .join("");
  const noteHtml = note
    ? `<p style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">${escapeHtml(note)}</p>`
    : "";
  return `<p style="margin:24px 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${EMAIL_COLORS.jade};font-weight:700;">How people found you</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${noteHtml}`;
}
