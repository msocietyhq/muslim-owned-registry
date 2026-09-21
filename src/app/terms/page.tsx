import type { Metadata } from "next";
import { localizedTerms } from "@/lib/legal";
import { getCopy } from "@/lib/lang";
import { ui } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Terms for muslimowned.sg, a free public listing where Singapore owners introduce Muslim-owned businesses to visitors.",
};

export default async function TermsPage() {
  const { lang, t } = await getCopy();
  const terms = await localizedTerms(lang);
  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.legal.termsTitle}</h1>
      <p className="mb-4 leading-relaxed">{t.legal.termsLead}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.meaningTitle}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.meaningBody}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.termsListings}</h2>
      <p className="mb-4 whitespace-pre-wrap leading-relaxed">{terms}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.termsAdmins}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.termsAdminsBody}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.termsIndependent}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.termsIndependentBody}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.termsGoverning}</h2>
      <p className="leading-relaxed">{t.legal.termsGoverningBody}</p>
    </div>
  );
}
