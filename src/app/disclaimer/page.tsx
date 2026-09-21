import type { Metadata } from "next";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { getCopy } from "@/lib/lang";
import { ui } from "@/lib/ui";

export const metadata: Metadata = {
  title: "About this listing",
  description:
    "muslimowned.sg is an independent community listing. Owners write a public page so visitors can find a Singapore business.",
  robots: { index: true, follow: true },
};

export default async function DisclaimerPage() {
  const { t } = await getCopy();
  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.legal.aboutTitle}</h1>
      <p className="mb-4 leading-relaxed">{t.legal.aboutLead}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.meaningTitle}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.meaningBody}</p>
      <p className="mb-4 leading-relaxed">{t.legal.aboutBody}</p>
      <div className="my-6 overflow-hidden rounded-md border border-rule">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
