import Link from "next/link";
import { DemoBadge } from "@/components/demo-badge";
import type { Business } from "@/lib/types";
import { isDemoListing } from "@/lib/types";
import { ui } from "@/lib/ui";

export function RegisterListings({
  businesses,
  heading = "Businesses mentioned here",
  demoLabel = "Demo",
}: {
  businesses: Business[];
  heading?: string;
  demoLabel?: string;
}) {
  if (!businesses.length) return null;
  return (
    <aside className="border-t border-rule/70 py-12">
      <h2 className={ui.sectionTitle}>{heading}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {businesses.map((business) => (
          <li key={business.slug} className={ui.card}>
            <div className="flex flex-wrap items-center gap-2">
              {isDemoListing(business) ? <DemoBadge label={demoLabel} /> : null}
              <Link href={`/biz/${business.slug}`} className="font-medium underline-offset-2 hover:underline">
                {business.brandName}
              </Link>
            </div>
            <p className={`${ui.small} mt-1`}>{business.registeredName}</p>
            {business.summary ? <p className="mt-2 leading-relaxed">{business.summary}</p> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
