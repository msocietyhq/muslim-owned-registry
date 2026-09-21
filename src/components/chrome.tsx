"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { SiteLogo } from "@/components/site-logo";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { useCopy } from "@/components/i18n-provider";
import { readSession } from "@/lib/api-client";
import { ui } from "@/lib/ui";

export function SiteHeader() {
  const { t } = useCopy();
  const pathname = usePathname();
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    readSession()
      .then((session) => {
        setUser(session.user);
        setAdmin(session.isAdmin);
      })
      .catch(() => {
        setUser(null);
        setAdmin(false);
      });
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/browse", label: t.nav.browse },
    { href: "/blog", label: t.nav.stories },
    { href: "/who-we-are", label: t.nav.whoWeAre },
    { href: "/why", label: t.nav.why },
    ...(admin ? [{ href: "/admin", label: t.nav.admin }] : []),
    ...(user ? [{ href: "/app", label: t.nav.yours }] : []),
  ];

  return (
    <div className="sticky top-0 z-40">
      <div className="bg-mihrab px-3 py-1.5 pt-[max(0.35rem,env(safe-area-inset-top))] text-center">
        <p className="font-sans text-[11px] font-semibold tracking-[0.06em] text-gold sm:text-xs">
          {t.banner}
        </p>
        <p className="mt-0.5 font-sans text-[10px] font-medium tracking-[0.02em] text-gold/80 sm:text-[11px]">
          {t.bannerNote}
        </p>
      </div>
      <header className="border-b border-rule/80 bg-surface/95 backdrop-blur">
        <div className={`${ui.shell} flex items-center gap-2 overflow-x-clip py-2 sm:gap-4 sm:py-2.5`}>
          <Link className="flex min-w-0 flex-1 items-center gap-2 no-underline sm:gap-3 md:flex-none" href="/">
            <SiteLogo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <span className="truncate font-display text-[18px] leading-tight text-mihrab sm:text-[22px]">
              {t.brand}
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center gap-x-4 overflow-x-auto md:flex xl:gap-x-5">
            {links.map((item) => (
              <Link key={item.href} className={`${ui.navLink} shrink-0 whitespace-nowrap`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-mihrab/20 text-mihrab md:hidden"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
              {open ? (
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
            <div className="hidden md:block">
              {user ? (
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-mihrab/25 px-4 font-sans text-sm font-semibold text-mihrab"
                  type="button"
                  onClick={() => {
                    void fetch("/api/better-auth/sign-out", { method: "POST", credentials: "include" }).then(() => {
                      setUser(null);
                      setAdmin(false);
                      window.location.reload();
                    });
                  }}
                >
                  {t.nav.signOut}
                </button>
              ) : (
                <Link className={`${ui.button} w-auto min-h-10 whitespace-nowrap px-4`} href="/login">
                  {t.nav.signIn}
                </Link>
              )}
            </div>
          </div>
        </div>
        {open ? (
          <div
            id="site-menu"
            className="border-t border-rule/70 bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
          >
            <div className={`${ui.shell} pt-4`}>
              <LanguageToggle fullWidth />
            </div>
            <nav className={`${ui.shell} grid pt-2`}>
              {links.map((item) => (
                <Link key={item.href} className={ui.menuLink} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className={`${ui.shell} grid gap-3 pt-4 pb-4`}>
              {user ? (
                <button
                  className={ui.buttonSecondary}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void fetch("/api/better-auth/sign-out", { method: "POST", credentials: "include" }).then(() => {
                      window.location.reload();
                    });
                  }}
                >
                  {t.nav.signOut}
                </button>
              ) : (
                <Link className={ui.button} href="/login" onClick={() => setOpen(false)}>
                  {t.nav.signIn}
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useCopy();
  const footerLink =
    "inline-flex min-h-11 items-center text-paper no-underline hover:text-gold";
  return (
    <footer className="mt-8 border-t border-rule bg-mihrab pb-[env(safe-area-inset-bottom)] text-paper">
      <div className={`${ui.shell} grid gap-8 py-10 sm:gap-10 sm:py-12 md:grid-cols-4`}>
        <div className="md:col-span-2">
          <p className="flex items-center gap-3 font-display text-2xl">
            <SiteLogo className="h-10 w-10" onDark />
            {t.brand}
          </p>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-paper/85">{t.footer.body}</p>
        </div>
        <div>
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            {t.footer.explore}
          </p>
          <ul className="grid">
            <li>
              <Link className={footerLink} href="/browse">
                {t.footer.browse}
              </Link>
            </li>
            <li>
              <Link className={footerLink} href="/#search">
                {t.nav.plan}
              </Link>
            </li>
            <li>
              <Link className={footerLink} href="/blog">
                {t.footer.stories}
              </Link>
            </li>
            <li>
              <Link className={footerLink} href="/who-we-are">
                {t.footer.whoWeAre}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            {t.footer.forOwners}
          </p>
          <ul className="grid">
            <li>
              <Link className={footerLink} href="/list-for-free-in-3-minutes">
                {t.footer.list}
              </Link>
            </li>
            <li>
              <Link className={footerLink} href="/login">
                {t.footer.signIn}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <DisclaimerBanner />
        <p className={`${ui.shell} flex flex-col gap-1 py-6 text-sm text-paper/80 sm:flex-row sm:flex-wrap sm:gap-x-4`}>
          <Link className="inline-flex min-h-11 items-center text-gold no-underline hover:underline" href="/disclaimer">
            {t.footer.disclaimer}
          </Link>
          <Link className="inline-flex min-h-11 items-center text-gold no-underline hover:underline" href="/terms">
            {t.footer.terms}
          </Link>
          <Link className="inline-flex min-h-11 items-center text-gold no-underline hover:underline" href="/privacy">
            {t.footer.privacy}
          </Link>
        </p>
      </div>
    </footer>
  );
}
