import type { Metadata } from "next";
import { getCopy } from "@/lib/lang";
import { ui } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How muslimowned.sg handles login emails, UEN documents, and the public fields on a live listing.",
};

export default async function PrivacyPage() {
  const { t } = await getCopy();
  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.legal.privacyTitle}</h1>
      <p className="mb-4 leading-relaxed">{t.legal.privacyLead}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.privacyPrivate}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.privacyPrivateBody}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.privacyPublic}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.privacyPublicBody}</p>
      <h2 className="mb-3 mt-8 text-2xl font-medium">{t.legal.privacyThird}</h2>
      <p className="mb-4 leading-relaxed">{t.legal.privacyThirdBody}</p>
      <p className="leading-relaxed">{t.legal.privacyClose}</p>
    </div>
  );
}
