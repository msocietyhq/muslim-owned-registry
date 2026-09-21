import Link from "next/link";
import { getCopy } from "@/lib/lang";
import { ui } from "@/lib/ui";

export default async function NotFound() {
  const { t } = await getCopy();
  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.notFound.title}</h1>
      <p className="mb-6 leading-relaxed">{t.notFound.body}</p>
      <Link className={ui.button} href="/browse">
        {t.notFound.cta}
      </Link>
    </div>
  );
}
