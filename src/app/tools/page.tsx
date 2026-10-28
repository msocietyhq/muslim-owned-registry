"use client";

import Link from "next/link";
import { useCopy } from "@/components/i18n-provider";
import { useAuthUser } from "@/lib/use-auth-user";
import { ui } from "@/lib/ui";

export default function ToolsPage() {
  const { t } = useCopy();
  const { ready } = useAuthUser();

  if (!ready) {
    return (
      <div className={`${ui.shell} ${ui.section}`}>
        <p>{t.app.loading}</p>
      </div>
    );
  }

  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <p className={ui.kicker}>Tools</p>
      <h1 className={ui.h1Wide}>Tools for your live listing</h1>
      <p className={ui.lede}>
        These tools use the company website on a listing that is already public. They are not for social profiles.
      </p>
      <section className="grid gap-4">
        <h2 className={ui.sectionTitle}>SEO & GEO</h2>
        <article className={ui.card}>
          <h3 className="font-display text-2xl text-mihrab">Website search assistant</h3>
          <p className="mt-3 max-w-[58ch] leading-relaxed">
            One website, one report. Press proceed, answer the questions, then download the Word or PDF report.
          </p>
          <p className="mt-5">
            <Link className={ui.button} href="/tools/seo-geo">
              Open SEO & GEO
            </Link>
          </p>
        </article>
      </section>
    </div>
  );
}
