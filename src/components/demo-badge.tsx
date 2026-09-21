import { isDemoListing } from "@/lib/types";
import { ui } from "@/lib/ui";

export function DemoBadge({ label }: { label: string }) {
  return (
    <span
      className={`${ui.badge} border-gold/70 bg-gold/15 text-[10px] tracking-[0.14em] text-mihrab`}
    >
      {label}
    </span>
  );
}

export function DemoNote({
  business,
  label,
  note,
}: {
  business: { isDemo: boolean | null };
  label: string;
  note: string;
}) {
  if (!isDemoListing(business)) return null;
  return (
    <div className="mb-5 flex max-w-[54ch] flex-col gap-2">
      <DemoBadge label={label} />
      <p className={ui.notice}>{note}</p>
    </div>
  );
}
