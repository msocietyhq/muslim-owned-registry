const REPLACEMENTS: [RegExp, string][] = [
  [/syn\s*scribe/gi, ""],
  [/sense\s*script/gi, ""],
  [/\bmoles\b/gi, "assistants"],
  [/\bmole\b/gi, "assistant"],
  [/\bmaul\b/gi, "assistant"],
];

/** Strip vendor and product names that must never reach an owner. */
export function redactVendorNames(input: string) {
  let text = input;
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
