export const SG_COUNTRY_CODE = "65";
export const WHATSAPP_TEMPLATE_MAX = 500;

export const WHATSAPP_NUMBER_ERROR =
  "Enter an 8-digit Singapore WhatsApp number, or include the country code for an overseas number.";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Store as country code + number digits, no plus. Empty input becomes null. */
export function parseWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const international = /^\s*(\+|00)/.test(trimmed);
  let digits = digitsOnly(/^\s*00/.test(trimmed) ? trimmed.replace(/^\s*00/, "") : trimmed);
  if (!digits) return null;
  if (digits.startsWith("0") && !international) {
    digits = digits.replace(/^0+/, "");
  }
  if (international) {
    if (digits.length < 8 || digits.length > 15) return null;
    return digits;
  }
  if (digits.startsWith(SG_COUNTRY_CODE) && digits.length >= 10 && digits.length <= 12) {
    return digits;
  }
  if (digits.length === 8) return `${SG_COUNTRY_CODE}${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function submittedWhatsapp(raw?: string | null) {
  if (raw == null || !String(raw).trim()) return null;
  const parsed = parseWhatsappNumber(raw);
  if (!parsed) {
    throw new Error(WHATSAPP_NUMBER_ERROR);
  }
  return parsed;
}

export function parseWhatsappTemplate(raw?: string | null) {
  if (raw == null) return null;
  const text = raw.replace(/\r\n/g, "\n").trim().slice(0, WHATSAPP_TEMPLATE_MAX);
  return text || null;
}

export function formatWhatsappDisplay(digits: string) {
  if (digits.startsWith(SG_COUNTRY_CODE) && digits.length === 10) {
    const local = digits.slice(2);
    return `+65 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return `+${digits}`;
}

export function whatsappHref(digits: string, template?: string | null) {
  const base = `https://wa.me/${digits}`;
  const text = template?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
