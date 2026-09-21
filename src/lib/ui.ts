export const ui = {
  shell: "mx-auto w-full max-w-6xl px-4 sm:px-6",
  kicker:
    "block font-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-jade",
  hero: "pb-8 pt-8 sm:pt-10",
  h1: "mb-4 max-w-none font-display text-[clamp(1.75rem,7.2vw,3.6rem)] font-medium leading-[1.12] text-mihrab sm:mb-5 sm:max-w-[22ch]",
  h1Wide:
    "mb-4 font-display text-[clamp(1.65rem,6.5vw,3rem)] font-medium leading-[1.15] text-mihrab [overflow-wrap:anywhere]",
  lede: "mb-6 max-w-[54ch] text-base leading-relaxed text-ink/90 sm:mb-8 sm:text-lg",
  section: "py-10 sm:py-12 md:py-16",
  sectionTitle: "mb-4 font-display text-[clamp(1.35rem,4.5vw,2rem)] font-medium text-mihrab",
  small: "font-sans text-sm leading-relaxed text-muted",
  legal: "max-w-[68ch]",
  form: "grid gap-4",
  formTwo: "grid gap-4 sm:grid-cols-2",
  search: "grid gap-3 sm:grid-cols-[1fr_auto]",
  ctaRow: "grid w-full gap-3 sm:flex sm:flex-wrap",
  label:
    "mb-1.5 block font-sans text-xs font-semibold uppercase tracking-[0.08em] text-muted",
  input:
    "min-h-12 w-full rounded-2xl border border-rule bg-surface px-4 py-3 font-sans text-base text-ink outline-none ring-jade/30 focus:border-jade focus:ring-2 disabled:cursor-not-allowed disabled:bg-leaf disabled:text-muted",
  textarea:
    "min-h-[120px] w-full rounded-2xl border border-rule bg-surface px-4 py-3 font-sans text-base text-ink outline-none ring-jade/30 focus:border-jade focus:ring-2",
  button:
    "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-mihrab bg-mihrab px-5 py-3 font-sans text-base font-semibold text-paper no-underline hover:bg-jade disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-11 sm:text-sm",
  buttonSecondary:
    "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-mihrab/30 bg-transparent px-5 py-3 font-sans text-base font-semibold text-mihrab no-underline hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-11 sm:text-sm",
  notice: "rounded-2xl border border-rule bg-leaf px-4 py-3 font-sans text-sm",
  noticeError:
    "rounded-2xl border border-stamp/40 bg-[#fbeeee] px-4 py-3 font-sans text-sm text-stamp",
  table: "mb-10 mt-6 w-full border-collapse",
  th: "border-b border-rule px-2 py-2.5 text-left font-sans text-[11px] uppercase tracking-[0.12em] text-muted",
  td: "border-b border-rule px-2 py-2.5 align-top",
  badge:
    "inline-flex rounded-full border border-current px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.08em]",
  columns: "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
  checkbox:
    "flex items-start gap-3 font-sans text-sm normal-case tracking-normal text-ink",
  check: "mt-0.5 h-5 w-5 min-h-5 min-w-5 shrink-0 accent-jade",
  navLink:
    "inline-flex min-h-11 items-center font-sans text-[15px] font-medium text-ink/80 no-underline hover:text-mihrab",
  link: "font-medium text-jade underline decoration-jade/30 underline-offset-2 hover:decoration-jade",
  card: "min-w-0 rounded-[1.5rem] border border-rule/70 bg-surface p-5 shadow-[0_12px_32px_-20px_rgba(14,75,58,0.45)] sm:p-6",
  chip: "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 font-sans text-sm",
  menuLink:
    "flex min-h-14 items-center border-b border-rule/70 px-1 font-sans text-lg font-medium text-mihrab no-underline",
};

export function badgeTone(status: string) {
  if (status === "live") return "text-live";
  if (status === "pending_review" || status === "pending" || status === "pending_activation")
    return "text-pending";
  return "text-stamp";
}
