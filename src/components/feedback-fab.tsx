"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCopy } from "@/components/i18n-provider";

export function FeedbackFab() {
  const { t } = useCopy();
  const pathname = usePathname();
  if (pathname === "/feedback" || pathname.startsWith("/feedback/")) return null;

  return (
    <Link
      href="/feedback"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-gold text-mihrab shadow-[0_16px_40px_-12px_rgba(12,63,50,0.85)] no-underline hover:bg-paper"
      aria-label={t.feedback.fab}
      title={t.feedback.fab}
    >
      <span className="sr-only">{t.feedback.fab}</span>
      <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H10l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z" />
      </svg>
    </Link>
  );
}
