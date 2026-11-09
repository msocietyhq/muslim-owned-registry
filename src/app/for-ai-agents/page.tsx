import type { Metadata } from "next";
import { getCopy } from "@/lib/lang";
import { siteUrl } from "@/lib/site-url";
import { ui } from "@/lib/ui";

export const metadata: Metadata = {
  title: "For AI agents",
  description:
    "This directory is completely free for everyone and for AI agents to access. No account needed.",
  alternates: { canonical: "/for-ai-agents" },
};

function listingShape(origin: string) {
  return {
    id: "listing-id",
    slug: "example-harbour-kopi",
    url: `${origin}/biz/example-harbour-kopi`,
    brandName: "Example Harbour Kopi",
    registeredName: "Example Harbour Kopi Pte. Ltd.",
    uen: "T99EX0001A",
    summary: "Kopi and cakes by the harbour.",
    description: "The full description shown on the listing page.",
    photos: [`${origin}/api/files/listing-photos/example.jpg`],
    contactEmail: "hello@example.test",
    whatsapp: "6591234567",
    whatsappUrl: "https://wa.me/6591234567",
    urls: [{ label: "Website", url: "https://example.test" }],
    linkedinUrl: null,
    address: "1 Harbourfront Walk, Singapore",
    lat: 1.264,
    lng: 103.82,
    tags: ["Food"],
    unclaimed: true,
    primaryColor: null,
    secondaryColor: null,
    owner: null,
  };
}

export default async function ForAiAgentsPage() {
  const { t } = await getCopy();
  const origin = siteUrl();
  const searchUrl = `${origin}/api/v1/public/search`;
  const listUrl = `${origin}/api/v1/public/listings?page=1`;
  const listing = listingShape(origin);
  const searchRequest = JSON.stringify({ query: "I want to organise a party" }, null, 2);
  const searchResponse = JSON.stringify(
    {
      groups: [
        {
          title: "Food and a place to gather",
          reason: "Listings that can help organise a party.",
          businesses: [listing],
        },
      ],
    },
    null,
    2,
  );
  const listResponse = JSON.stringify(
    {
      page: 1,
      pageSize: 50,
      total: 227,
      totalPages: 5,
      next: `${origin}/api/v1/public/listings?page=2`,
      listings: [listing],
    },
    null,
    2,
  );

  return (
    <div className={`${ui.shell} ${ui.section} ${ui.legal}`}>
      <h1 className={ui.h1Wide}>{t.agentsPage.title}</h1>
      <p className={ui.lede}>{t.agentsPage.lead}</p>

      <h2 className={ui.sectionTitle}>{t.agentsPage.searchTitle}</h2>
      <p className="max-w-[62ch] leading-relaxed">{t.agentsPage.searchBody}</p>
      <p className="mt-4 font-mono text-sm [overflow-wrap:anywhere]">POST {searchUrl}</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-leaf p-4 font-mono text-sm leading-relaxed">
        {searchRequest}
      </pre>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-leaf p-4 font-mono text-sm leading-relaxed">
        {searchResponse}
      </pre>

      <h2 className={`${ui.sectionTitle} mt-12`}>{t.agentsPage.listTitle}</h2>
      <p className="max-w-[62ch] leading-relaxed">{t.agentsPage.listBody}</p>
      <p className="mt-4 font-mono text-sm [overflow-wrap:anywhere]">GET {listUrl}</p>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-leaf p-4 font-mono text-sm leading-relaxed">
        {listResponse}
      </pre>
    </div>
  );
}
