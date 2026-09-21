"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { SmartSearchForm } from "@/components/smart-search-form";
import { useCopy } from "@/components/i18n-provider";
import { hasCountedSearch, markCountedSearch } from "@/lib/stats-client";
import { getVisitorId } from "@/lib/visitor-client";
import { ui } from "@/lib/ui";

type Group = {
  title: string;
  reason: string;
  businesses: { slug: string; brandName: string }[];
};

export default function PlanPage() {
  const { lang, t } = useCopy();
  const [intent, setIntent] = useState("");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          lang,
          countSearch: !hasCountedSearch(),
          visitorId: getVisitorId(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      markCountedSearch();
      setGroups(data.groups || []);
    } catch {
      setError(t.plan.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.plan.title}</h1>
      <p className="mb-6 leading-relaxed">{t.plan.lead}</p>
      <SmartSearchForm
        intent={intent}
        onIntent={setIntent}
        onSubmit={onSubmit}
        busy={busy}
        examples={t.home.examples}
      />
      {error ? <p className={`${ui.noticeError} mt-3`}>{error}</p> : null}
      {groups && groups.length === 0 ? (
        <p className="mt-6 leading-relaxed">{t.plan.empty}</p>
      ) : null}
      {groups?.map((group) => (
        <section key={group.title} className="border-t border-rule/70 py-8">
          <h2 className={ui.sectionTitle}>{group.title}</h2>
          <ul className="mt-3 list-disc pl-5">
            {group.businesses.map((business) => (
              <li key={business.slug}>
                <Link href={`/biz/${business.slug}`} className={ui.link}>
                  {business.brandName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
