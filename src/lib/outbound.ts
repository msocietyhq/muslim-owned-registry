const SITE_HOSTS = new Set(["muslimowned.sg", "www.muslimowned.sg"]);

export function outboundDomain(href: string): string | null {
  try {
    const url = new URL(href.trim(), "https://muslimowned.sg");
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.replace(/\.$/, "").toLowerCase();
    if (!host.includes(".")) return null;
    const apex = host.replace(/^www\./, "");
    if (SITE_HOSTS.has(host) || SITE_HOSTS.has(apex)) return null;
    return host;
  } catch {
    return null;
  }
}

export function isOutboundHttpUrl(href: string) {
  return outboundDomain(href) != null;
}
