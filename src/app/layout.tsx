import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Noto_Sans_SC, Noto_Sans_Tamil, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { I18nProvider } from "@/components/i18n-provider";
import { WishlistDock } from "@/components/wishlist-dock";
import { SiteVisitTracker } from "@/components/site-visit-tracker";
import { getCopy } from "@/lib/lang";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const notoSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-sc",
  display: "swap",
});

const notoTa = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-ta",
  display: "swap",
});

const title = "muslimowned.sg — Find Muslim-owned businesses in Singapore";
const description =
  "A free public directory where you can search and support Muslim-owned businesses in Singapore. Type what you need, find a listing, and get in touch.";

export const preferredRegion = "asia-southeast1";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c3f32",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: title,
    template: "%s · muslimowned.sg",
  },
  description,
  openGraph: {
    title,
    description,
    siteName: "muslimowned.sg",
    type: "website",
    images: ["/logo.png"],
  },
  icons: { icon: [{ url: "/logo.svg", type: "image/svg+xml" }, { url: "/logo.png" }] },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const { lang, t } = await getCopy();
  const langClass = lang === "zh" ? "lang-zh" : lang === "ta" ? "lang-ta" : "";
  return (
    <html
      lang={t.htmlLang}
      className={`${jakarta.variable} ${fraunces.variable} ${caveat.variable} ${notoSc.variable} ${notoTa.variable} ${langClass} bg-paper text-ink`}
    >
      <body className="min-h-screen font-sans leading-relaxed antialiased">
        <I18nProvider lang={lang} t={t}>
          <a
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-mihrab"
            href="#main"
          >
            {t.skip}
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          {modal}
          <SiteFooter />
          <WishlistDock />
          <SiteVisitTracker />
        </I18nProvider>
      </body>
    </html>
  );
}
