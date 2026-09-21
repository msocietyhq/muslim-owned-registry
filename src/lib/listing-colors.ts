import type { CSSProperties } from "react";

export const DEFAULT_LISTING_PRIMARY = "#0c3f32";
export const DEFAULT_LISTING_SECONDARY = "#c4a35a";

export type ListingColors = {
  primaryColor: string | null;
  secondaryColor: string | null;
};

export const emptyListingColors = (): ListingColors => ({
  primaryColor: null,
  secondaryColor: null,
});

export function parseCssColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const a = hex[1];
    const b = hex[2];
    const c = hex[3];
    if (!a || !b || !c) return null;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return null;
}

export function listingColorsFromInput(
  primary?: string | null,
  secondary?: string | null,
): ListingColors {
  const primaryColor = parseCssColor(primary);
  if (!primaryColor) return emptyListingColors();
  return {
    primaryColor,
    secondaryColor: parseCssColor(secondary),
  };
}

export function onColor(hex: string) {
  return relativeLuminance(hex) > 0.55 ? "#122821" : "#fffdf8";
}

export function listingBrandProps(colors: ListingColors): {
  style?: CSSProperties;
  "data-has-primary"?: "1";
  "data-has-secondary"?: "1";
} {
  if (!colors.primaryColor) return {};
  const style: CSSProperties & Record<string, string> = {
    "--listing-primary": colors.primaryColor,
    "--listing-on-primary": onColor(colors.primaryColor),
  };
  if (colors.secondaryColor) {
    style["--listing-secondary"] = colors.secondaryColor;
    style["--listing-on-secondary"] = onColor(colors.secondaryColor);
  }
  return {
    style,
    "data-has-primary": "1",
    ...(colors.secondaryColor ? { "data-has-secondary": "1" as const } : {}),
  };
}

export type PageColorHints = {
  themeColor: string | null;
  palette: string[];
};

export function emptyPageColorHints(): PageColorHints {
  return { themeColor: null, palette: [] };
}

export function cssValueToHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || /^var\(/i.test(value) || /^(transparent|currentcolor|inherit|none)$/i.test(value)) {
    return null;
  }
  const hex = parseCssColor(value) || parseHexWithAlpha(value);
  if (hex) return hex;
  const rgb = parseRgb(value);
  if (rgb) return rgb;
  return parseHsl(value);
}

export function extractPageColorHints(html: string): PageColorHints {
  const counts = new Map<string, number>();
  function add(raw: string, weight = 1) {
    const hex = cssValueToHex(raw);
    if (!hex || !isUsableSwatch(hex)) return;
    counts.set(hex, (counts.get(hex) || 0) + weight);
  }

  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const theme =
    firstMetaColor(withoutScripts, "theme-color") ||
    firstMetaColor(withoutScripts, "msapplication-TileColor");
  if (theme) add(theme, 14);

  for (const block of withoutScripts.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    collectCssColors(block[1] || "", add);
  }
  for (const attr of withoutScripts.matchAll(/\bstyle=["']([^"']+)["']/gi)) {
    collectCssColors(attr[1] || "", add);
  }
  for (const attr of withoutScripts.matchAll(/\b(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi)) {
    add(attr[1] || "", 2);
  }
  if (!/<style\b/i.test(withoutScripts) && /[{:]/.test(withoutScripts)) {
    collectCssColors(withoutScripts.replace(/<[^>]+>/g, " "), add);
  }

  const palette = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([hex]) => hex)
    .slice(0, 16);

  return {
    themeColor: theme && isUsableSwatch(theme) ? theme : null,
    palette,
  };
}

export function pickListingColors(
  hints: PageColorHints,
  preferred?: { primaryColor?: string | null; secondaryColor?: string | null },
  options?: { allowPreferred?: boolean },
): { primaryColor: string; secondaryColor: string } {
  const extra = options?.allowPreferred
    ? [preferred?.primaryColor, preferred?.secondaryColor].map((item) => cssValueToHex(item) || "")
    : [];
  const palette = uniqueHex([...hints.palette, hints.themeColor || "", ...extra]).filter(isUsableSwatch);

  const preferredPrimary = hexInPalette(preferred?.primaryColor, palette);
  const preferredSecondary = hexInPalette(preferred?.secondaryColor, palette);
  const themePrimary =
    hints.themeColor && isUsablePrimary(hints.themeColor) ? hints.themeColor : null;

  const primary =
    preferredPrimary ||
    themePrimary ||
    palette.slice().sort((a, b) => primaryScore(b, hints) - primaryScore(a, hints))[0] ||
    "";
  if (!primary) return { primaryColor: "", secondaryColor: "" };

  const secondary =
    (preferredSecondary && !tooSimilar(preferredSecondary, primary) ? preferredSecondary : "") ||
    palette
      .filter((hex) => hex !== primary && !tooSimilar(hex, primary))
      .sort((a, b) => secondaryScore(b, primary) - secondaryScore(a, primary))[0] ||
    "";

  return { primaryColor: primary, secondaryColor: secondary };
}

export function mergePageColorHints(items: PageColorHints[]): PageColorHints {
  const palette = uniqueHex(items.flatMap((item) => item.palette));
  return {
    themeColor: items.map((item) => item.themeColor).find(Boolean) || null,
    palette,
  };
}

function relativeLuminance(hex: string) {
  const n = hex.replace("#", "");
  const toLin = (part: string) => {
    const channel = Number.parseInt(part, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const r = toLin(n.slice(0, 2));
  const g = toLin(n.slice(2, 4));
  const b = toLin(n.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function collectCssColors(css: string, add: (raw: string, weight?: number) => void) {
  for (const match of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    add(`#${match[1]}`);
  }
  for (const match of css.matchAll(
    /rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,
  )) {
    add(match[0]);
  }
  for (const match of css.matchAll(
    /hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi,
  )) {
    add(match[0]);
  }
  for (const match of css.matchAll(/--[a-z0-9-]*(primary|brand|theme)[a-z0-9-]*\s*:\s*([^;}\n]+)/gi)) {
    add(match[2] || "", 10);
  }
  for (const match of css.matchAll(/--[a-z0-9-]*(secondary|accent)[a-z0-9-]*\s*:\s*([^;}\n]+)/gi)) {
    add(match[2] || "", 8);
  }
}

function firstMetaColor(html: string, name: string) {
  const pattern = new RegExp(
    `<meta\\b[^>]*(?:name|property)=["']${name}["'][^>]*>`,
    "gi",
  );
  for (const tag of html.matchAll(pattern)) {
    const content = tag[0].match(/\bcontent=["']([^"']+)["']/i)?.[1];
    const hex = cssValueToHex(content || "");
    if (hex && isUsableSwatch(hex)) return hex;
  }
  const flipped = new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["'][^>]*>`,
    "gi",
  );
  for (const tag of html.matchAll(flipped)) {
    const hex = cssValueToHex(tag[1] || "");
    if (hex && isUsableSwatch(hex)) return hex;
  }
  return null;
}

function parseHexWithAlpha(value: string) {
  const match = value.trim().match(/^#([0-9a-fA-F]{8})$/);
  if (!match?.[1]) return null;
  const alpha = Number.parseInt(match[1].slice(6, 8), 16) / 255;
  if (alpha < 0.5) return null;
  return parseCssColor(`#${match[1].slice(0, 6)}`);
}

function parseRgb(value: string) {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (!match) return null;
  if (alphaTooLow(match[4])) return null;
  const channels = [match[1], match[2], match[3]].map((part) => {
    const n = Number(part);
    return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : null;
  });
  if (channels.some((item) => item == null)) return null;
  return `#${channels.map((n) => n!.toString(16).padStart(2, "0")).join("")}`;
}

function parseHsl(value: string) {
  const match = value.match(
    /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (!match) return null;
  if (alphaTooLow(match[4])) return null;
  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;
  if (![h, s, l].every(Number.isFinite)) return null;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function alphaTooLow(raw?: string) {
  if (!raw) return false;
  const value = raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
  return Number.isFinite(value) && value < 0.5;
}

function isUsableSwatch(hex: string) {
  const lum = relativeLuminance(hex);
  return saturation(hex) >= 0.12 && lum >= 0.04 && lum <= 0.88;
}

function isUsablePrimary(hex: string) {
  const lum = relativeLuminance(hex);
  return isUsableSwatch(hex) && lum <= 0.64;
}

function primaryScore(hex: string, hints: PageColorHints) {
  const lum = relativeLuminance(hex);
  const lumScore = lum < 0.08 ? 0.35 : lum > 0.58 ? 0.45 : 1;
  const themeBonus = hints.themeColor === hex ? 6 : 0;
  return themeBonus + saturation(hex) * 3 + lumScore * 2;
}

function secondaryScore(hex: string, primary: string) {
  return saturation(hex) * 2 + hueDistance(hex, primary) / 90 + Math.abs(relativeLuminance(hex) - relativeLuminance(primary));
}

function tooSimilar(a: string, b: string) {
  const lumDiff = Math.abs(relativeLuminance(a) - relativeLuminance(b));
  return hueDistance(a, b) < 18 && lumDiff < 0.14 && Math.abs(saturation(a) - saturation(b)) < 0.16;
}

function saturation(hex: string) {
  const [r, g, b] = rgb(hex).map((n) => n / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return 0;
  return d / (1 - Math.abs(2 * l - 1));
}

function hueDistance(a: string, b: string) {
  const ha = hue(a);
  const hb = hue(b);
  return Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb));
}

function hue(hex: string) {
  const [r, g, b] = rgb(hex).map((n) => n / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function rgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    Number.parseInt(n.slice(0, 2), 16),
    Number.parseInt(n.slice(2, 4), 16),
    Number.parseInt(n.slice(4, 6), 16),
  ];
}

function hexInPalette(raw: string | null | undefined, palette: string[]) {
  const hex = cssValueToHex(raw);
  if (!hex) return "";
  if (palette.includes(hex)) return hex;
  const near = palette.find((item) => colorDistance(item, hex) <= 28);
  return near || "";
}

function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb);
}

function uniqueHex(items: string[]) {
  const out: string[] = [];
  for (const raw of items) {
    const hex = cssValueToHex(raw);
    if (hex && !out.includes(hex)) out.push(hex);
  }
  return out;
}
