import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback-form";
import { getCopy } from "@/lib/lang";
import { ui } from "@/lib/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getCopy();
  return {
    title: t.feedback.title,
    description: t.feedback.lead,
    alternates: { canonical: "/feedback" },
  };
}

export default async function FeedbackPage() {
  const { t } = await getCopy();
  return (
    <div className={`${ui.shell} ${ui.section}`}>
      <h1 className={ui.h1Wide}>{t.feedback.title}</h1>
      <p className={`${ui.lede} max-w-[54ch]`}>{t.feedback.lead}</p>
      <ul className="mb-10 max-w-[54ch] list-disc space-y-2 pl-5 leading-relaxed">
        <li>{t.feedback.use1}</li>
        <li>{t.feedback.use2}</li>
        <li>{t.feedback.use3}</li>
      </ul>
      <FeedbackForm />
    </div>
  );
}
