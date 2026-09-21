import Link from "next/link";
import { AddressCopyRow } from "@/components/address-copy-row";
import { CopyTextButton } from "@/components/copy-text-button";
import { DemoNote } from "@/components/demo-badge";
import { ListingViewBeacon } from "@/components/listing-view-beacon";
import { MarkdownBody } from "@/components/markdown-body";
import { OsmEmbed } from "@/components/osm-embed";
import { OutboundLink } from "@/components/outbound-link";
import { PhotoStrip } from "@/components/photo-strip";
import { SavedHeart } from "@/components/saved-heart";
import { listingBrandProps } from "@/lib/listing-colors";
import { businessPin } from "@/lib/geo";
import { historyAuthorPhrase, listingHistoryView } from "@/lib/history-display";
import type { Messages } from "@/lib/i18n";
import type { Business, Owner, Tag, Verification } from "@/lib/types";
import { isDemoListing } from "@/lib/types";
import { ui } from "@/lib/ui";
import { formatWhatsappDisplay, whatsappHref } from "@/lib/whatsapp";

type HistoryRow = {
  id: string;
  op: string;
  createdAt: string;
  snapshot?: Record<string, unknown>;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
};

export function BusinessProfile({
  business,
  owner,
  tags,
  history,
  verifications,
  mentionedIn,
  locale,
  t,
}: {
  business: Business;
  owner: Owner | null;
  tags: Map<string, Tag>;
  history: HistoryRow[];
  verifications: Verification[];
  mentionedIn: { slug: string; title: string }[];
  locale: string;
  t: Messages;
}) {
  const pin = businessPin(business);
  const tagNames = new Map([...tags.values()].map((tag) => [tag.id, tag.name]));
  const historyItems = listingHistoryView(history, {
    copy: t.biz,
    statusLabels: t.status as Record<string, string>,
    tagNames,
  });
  const brand = listingBrandProps({
    primaryColor: business.primaryColor,
    secondaryColor: business.secondaryColor,
  });
  const outbound = {
    title: t.biz.externalTitle,
    lead: t.biz.externalLead,
    confirm: t.biz.externalConfirm,
    cancel: t.biz.externalCancel,
  };

  function opLine(op: string) {
    if (op === "create") return t.biz.created;
    if (op === "delete") return t.biz.deletedOp;
    return t.biz.updatedOp;
  }

  return (
    <div className={`${ui.shell} listing-brand`} {...brand}>
      {isDemoListing(business) ? null : <ListingViewBeacon businessId={business.id} />}
      <section className={`${ui.hero} grid gap-8 md:grid-cols-[1.4fr_0.8fr]`}>
        <div>
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className={`${ui.h1Wide} !mb-0`}>{business.brandName}</h1>
              <p className="mt-1 max-w-[54ch] font-sans text-[11px] font-medium leading-snug text-muted sm:text-xs">
                {business.registeredName}
              </p>
              <div className="mt-0.5 flex min-w-0 items-center gap-0.5">
                <p className="font-sans text-[10px] font-semibold tracking-[0.08em] text-muted sm:text-[11px]">
                  {business.uen}
                </p>
                <CopyTextButton
                  text={business.uen}
                  copyLabel={t.biz.copyAddress}
                  copiedLabel={t.biz.copiedAddress}
                  compact
                />
              </div>
            </div>
            <SavedHeart
              slug={business.slug}
              saveLabel={t.card.save}
              unsaveLabel={t.card.unsave}
            />
          </div>
          <DemoNote business={business} label={t.card.demo} note={t.biz.demoNote} />
          {business.photos?.length ? (
            <div className="mb-6">
              <PhotoStrip photos={business.photos} alt={business.brandName} />
            </div>
          ) : null}
          {business.summary ? <p className="mb-6 max-w-[54ch] leading-relaxed">{business.summary}</p> : null}
          {business.description ? (
            <MarkdownBody content={business.description} className="mb-6 max-w-[62ch]" outbound={outbound} />
          ) : null}
          {business.whatsapp ? (
            <p className={`${ui.ctaRow} mt-2`}>
              <OutboundLink
                className={`${ui.buttonSecondary} listing-secondary-cta`}
                href={whatsappHref(business.whatsapp, business.whatsappTemplate)}
                copy={outbound}
              >
                {t.biz.whatsappCta}
              </OutboundLink>
            </p>
          ) : null}
        </div>
        <aside className={`${ui.card} h-fit`}>
          <p className="leading-relaxed">{t.biz.about}</p>
        </aside>
      </section>

      <section className="grid gap-8 border-t border-rule/70 py-12 md:grid-cols-2">
        <div>
          <h2 className={ui.sectionTitle}>{t.biz.contact}</h2>
          <p>
            <a className={ui.link} href={`mailto:${business.contactEmail}`}>
              {business.contactEmail}
            </a>
          </p>
          {business.whatsapp ? (
            <p className="mt-3">
              <OutboundLink
                className={ui.link}
                href={whatsappHref(business.whatsapp, business.whatsappTemplate)}
                copy={outbound}
              >
                {t.biz.whatsapp} {formatWhatsappDisplay(business.whatsapp)}
              </OutboundLink>
            </p>
          ) : null}
          {owner ? (
            <p className="mt-4">
              {t.biz.owner}:{" "}
              <Link href={`/owner/${owner.slug}`} className={ui.link}>
                {owner.displayName}
              </Link>
            </p>
          ) : null}
          {business.tagIds.length ? (
            <p className="mt-4">
              {t.biz.tags}{" "}
              {business.tagIds.map((id, index) => {
                const tag = tags.get(id);
                if (!tag) return null;
                return (
                  <span key={tag.id}>
                    {index ? ", " : null}
                    <Link href={`/tags/${tag.slug}`} className={ui.link}>
                      {tag.name}
                    </Link>
                  </span>
                );
              })}
              .
            </p>
          ) : null}
        </div>
        <div>
          <h2 className={ui.sectionTitle}>{t.biz.website}</h2>
          {business.urls.length ? (
            <ul className="grid gap-2">
              {business.urls.map((item) => (
                <li key={item.url} className="[overflow-wrap:anywhere]">
                  <OutboundLink href={item.url} className={ui.link} copy={outbound}>
                    {item.url}
                  </OutboundLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.small}>{business.linkedinUrl ? t.biz.linkedin : business.contactEmail}</p>
          )}
          {business.linkedinUrl ? (
            <p className="mt-3">
              <OutboundLink href={business.linkedinUrl} className={ui.link} copy={outbound}>
                {business.linkedinUrl}
              </OutboundLink>
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-t border-rule/70 py-12">
        <h2 className={ui.sectionTitle}>{t.biz.map}</h2>
        <AddressCopyRow
          address={business.address}
          copyLabel={t.biz.copyAddress}
          copiedLabel={t.biz.copiedAddress}
        />
        {pin ? (
          <OsmEmbed point={pin} title={business.brandName} openLabel={t.biz.openOsm} />
        ) : (
          <p className={`${ui.small} max-w-[54ch]`}>{t.biz.online}</p>
        )}
      </section>

      {mentionedIn.length ? (
        <section className="border-t border-rule/70 py-12">
          <h2 className={ui.sectionTitle}>{t.biz.mentioned}</h2>
          <ul className="space-y-2">
            {mentionedIn.map((article) => (
              <li key={article.slug}>
                <Link href={`/article/${article.slug}`} className={ui.link}>
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-rule/70 py-12">
        <h2 className={ui.sectionTitle}>{t.biz.history}</h2>
        <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain rounded-2xl border border-rule/70 bg-surface/70 px-4 py-3">
          <ul className="font-sans text-[15px] leading-relaxed">
            {historyItems.map((item) => {
              const status = typeof item.snapshot?.status === "string" ? item.snapshot.status : "";
              const statusLabel =
                (t.status as Record<string, string>)[status] || status.replace(/_/g, " ");
              return (
                <li key={item.id} className="mb-3 border-b border-rule/40 pb-3 last:mb-0 last:border-0 last:pb-0">
                  <p>
                    {opLine(item.op)}{" "}
                    {historyAuthorPhrase(
                      item,
                      {
                        byAdmin: t.biz.byAdmin,
                        byOwner: t.biz.byOwner,
                        bySystem: t.biz.bySystem,
                        byLink: t.biz.byLink,
                        byUnknown: t.biz.byUnknown,
                      },
                      { hideEmail: true },
                    )}{" "}
                    {new Date(item.createdAt).toLocaleString(locale)}
                    {item.op === "create" && statusLabel ? ` ${t.biz.status} ${statusLabel}` : ""}.
                  </p>
                  {item.diffs.length ? (
                    <ul className="mt-2 grid gap-1 text-[14px] text-ink/85">
                      {item.diffs.map((diff) => (
                        <li key={diff.key}>{diff.line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
        {verifications.length ? (
          <p className={`${ui.small} mt-4`}>
            {verifications
              .map((item) =>
                item.verifiedAt
                  ? `${item.type} · ${new Date(item.verifiedAt).toLocaleDateString(locale)}`
                  : item.type,
              )
              .join(" · ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
