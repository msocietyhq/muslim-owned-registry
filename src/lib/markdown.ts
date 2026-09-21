export const DESCRIPTION_MAX = 8000;

export function sanitizeMarkdown(input: string) {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .slice(0, DESCRIPTION_MAX)
    .trim();
}

export function markdownPlainText(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
