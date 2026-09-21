"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_OPTIONS, type Lang } from "@/lib/i18n";
import { useCopy } from "@/components/i18n-provider";

export function LanguageToggle({
  className = "",
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const { lang, t } = useCopy();

  function setLang(next: Lang) {
    document.cookie = `${LANG_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      className={`inline-flex rounded-full border border-mihrab/25 bg-leaf p-0.5 font-sans text-[11px] font-bold tracking-wide sm:text-xs ${
        fullWidth ? "w-full" : "shrink-0"
      } ${className}`}
      role="group"
      aria-label={t.nav.language}
    >
      {LANG_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={lang === option.id}
          className={`${
            fullWidth ? "min-h-10 flex-1 px-2" : "min-h-9 min-w-[2.4rem] px-2.5 sm:min-h-10"
          } inline-flex items-center justify-center rounded-full transition ${
            lang === option.id ? "bg-mihrab text-paper" : "text-mihrab hover:bg-paper"
          }`}
          onClick={() => setLang(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
