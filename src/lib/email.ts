import { Resend } from "resend";
import { siteUrl } from "@/lib/http";
import {
  hasListingTraffic,
  listingEmailStats,
  listingStatsText,
  renderSiteEmail,
  renderSiteEmailText,
  type SiteEmailContent,
} from "@/lib/email-layout";
import type { ListingStats, UrlPair } from "@/lib/types";
import { runtimeEnv } from "@/lib/runtime-env";
import { formatWhatsappDisplay } from "@/lib/whatsapp";

export type MailContent = {
  subject: string;
  html: string;
  text: string;
};

export function fromAddress() {
  return runtimeEnv("MAIL_FROM");
}

function resendClient() {
  const key = runtimeEnv("RESEND_API_KEY");
  if (!key) return null;
  return new Resend(key);
}

async function send(to: string | string[], mail: MailContent) {
  const client = resendClient();
  if (!client) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OTP !== "true") {
      throw new Error("Mail is not configured. Set RESEND_API_KEY.");
    }
    console.info(`[mail:dev] to=${Array.isArray(to) ? to.join(",") : to} subject=${mail.subject}\n${mail.text}`);
    return { id: "dev-log" };
  }
  const from = fromAddress();
  if (!from) {
    throw new Error("Mail is not configured. Set MAIL_FROM.");
  }
  const result = await client.emails.send({
    from,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function mailFrom(content: SiteEmailContent, subject: string): MailContent {
  return {
    subject,
    html: renderSiteEmail(content),
    text: renderSiteEmailText(content),
  };
}

const DIRECTORY_FOOTER =
  "muslimowned.sg is a free directory of Muslim-owned businesses in Singapore.";

export function loginEmail(params: { code: string; magicUrl: string }): MailContent {
  return mailFrom(
    {
      preheader: `Your sign-in code is ${params.code}. It expires in 10 minutes.`,
      kicker: "Sign in",
      heading: "Your sign-in code",
      intro: ["Use this code to sign in to muslimowned.sg."],
      highlight: params.code,
      highlightHint: "It expires in 10 minutes.",
      cta: { href: params.magicUrl, label: "Open the sign-in link" },
      outro: ["If you did not ask to sign in, you can ignore this email."],
      footer: DIRECTORY_FOOTER,
    },
    "Your muslimowned.sg sign-in code",
  );
}

export async function sendLoginMail(params: {
  to: string;
  code: string;
  magicUrl: string;
}) {
  return send(params.to, loginEmail(params));
}

export function listQuickEmail(params: { code: string; magicUrl: string; brandName: string }): MailContent {
  const brand = params.brandName.trim() || "your listing";
  return mailFrom(
    {
      preheader: `Your code is ${params.code}. Confirm to send ${brand} for review.`,
      kicker: "Confirm your listing",
      heading: "Confirm and send for review",
      intro: [
        `Use this code, or the link, to confirm ${brand} on muslimowned.sg.`,
        "We will only send the listing to an admin after you confirm. It is not public yet.",
      ],
      highlight: params.code,
      highlightHint: "It expires in 10 minutes.",
      cta: { href: params.magicUrl, label: "Confirm this listing" },
      outro: ["If you did not start a listing, you can ignore this email."],
      footer: DIRECTORY_FOOTER,
    },
    `Confirm ${brand} on muslimowned.sg`,
  );
}

export async function sendListQuickMail(params: {
  to: string;
  code: string;
  magicUrl: string;
  brandName: string;
}) {
  return send(params.to, listQuickEmail(params));
}

export function listingLiveEmail(params: {
  brandName: string;
  slug: string;
}): MailContent {
  const url = `${siteUrl()}/biz/${params.slug}`;
  return mailFrom(
    {
      preheader: `${params.brandName} has been approved and is now live on muslimowned.sg.`,
      kicker: "Approved and live",
      heading: `${params.brandName} is approved and live`,
      intro: [
        `An admin has approved ${params.brandName}. It is now on the public directory. You do not need to publish it again.`,
        "People can search for you, open your page, and get in touch.",
      ],
      cta: { href: url, label: "View your public page" },
      outro: [
        "Please allow emails from this address. Every four months we will ask you to confirm that you are still operating.",
      ],
      footer: DIRECTORY_FOOTER,
    },
    `${params.brandName} is approved and live on muslimowned.sg`,
  );
}

export async function sendListingLiveMail(params: {
  to: string;
  brandName: string;
  slug: string;
}) {
  return send(params.to, listingLiveEmail(params));
}

export function listingRejectedEmail(params: {
  brandName: string;
  listingId: string;
  note: string;
}): MailContent {
  const editUrl = `${siteUrl()}/app/businesses/${params.listingId}`;
  return mailFrom(
    {
      preheader: `${params.brandName} was not published. Please edit it and submit it again.`,
      kicker: "Please edit and submit again",
      heading: `${params.brandName} was not published`,
      intro: [
        `An admin did not publish ${params.brandName}. Please read the comment, edit the listing, and submit it again.`,
      ],
      highlight: params.note,
      highlightHint: "Comment from the admin",
      cta: { href: editUrl, label: "Edit and submit again" },
      outro: [
        "Sign in, change what the admin asked for, then save the listing. We will review it again.",
      ],
      footer: DIRECTORY_FOOTER,
    },
    `${params.brandName} was not published — please edit and submit again`,
  );
}

export async function sendListingRejectedMail(params: {
  to: string;
  brandName: string;
  listingId: string;
  note: string;
}) {
  return send(params.to, listingRejectedEmail(params));
}

export function listingInviteEmail(params: {
  brandName: string;
  openUrl: string;
}): MailContent {
  return mailFrom(
    {
      preheader: `An admin started a muslimowned.sg listing for ${params.brandName}. Please review it and submit it.`,
      kicker: "A listing was started for you",
      heading: `Please review ${params.brandName}`,
      intro: [
        `An admin at muslimowned.sg started a listing for ${params.brandName} so you do not have to type everything from scratch.`,
        "Open the link, check every field, add anything that is missing, tick the agreement, and submit it for review. It will not go public until you do that and an admin approves it.",
      ],
      cta: { href: params.openUrl, label: "Open and finish this listing" },
      outro: [
        "The link signs you in with this email. If it has expired, sign in at muslimowned.sg with the same email and open Your listings.",
      ],
      footer: DIRECTORY_FOOTER,
    },
    `Please review ${params.brandName} on muslimowned.sg`,
  );
}

export async function sendListingInviteMail(params: {
  to: string;
  brandName: string;
  openUrl: string;
}) {
  return send(params.to, listingInviteEmail(params));
}

export function confirmationEmail(params: {
  brandName: string;
  confirmUrl: string;
  stats?: ListingStats | null;
  isReminder?: boolean;
}): MailContent {
  const stats = listingEmailStats(params.stats);
  const hasTraffic = hasListingTraffic(params.stats);
  const subject = params.isReminder
    ? `Reminder: confirm ${params.brandName} is still operating`
    : `Please confirm ${params.brandName} is still operating`;
  const heading = params.isReminder
    ? `A reminder for ${params.brandName}`
    : `Confirm ${params.brandName}`;
  const intro = params.isReminder
    ? [
        `Please confirm that ${params.brandName} is still operating. You do not need to sign in.`,
        hasTraffic
          ? "People are already finding this listing. Confirm it so the page stays public."
          : "Confirm it so visitors can keep finding you on the directory.",
      ]
    : [
        `Every four months we ask owners to confirm their listing is still operating. You do not need to sign in.`,
        hasTraffic
          ? "Your page is being found. Confirm it so people can still reach you."
          : "Confirm the listing so it stays on the public directory.",
      ];
  return mailFrom(
    {
      preheader: hasTraffic
        ? listingStatsText(params.stats)
        : `Confirm ${params.brandName} is still operating on muslimowned.sg.`,
      kicker: params.isReminder ? "Please confirm" : "Four-month confirmation",
      heading,
      intro,
      stats: hasTraffic ? stats : undefined,
      statsNote: hasTraffic
        ? "Unique people are counted once. Page opens count each visit. Confirm so this page stays live."
        : undefined,
      cta: { href: params.confirmUrl, label: `Confirm ${params.brandName}` },
      outro: [
        "We will remind you every week until you confirm. If we do not hear from you, the listing will be unpublished. You can sign in later and publish it again.",
      ],
      footer: DIRECTORY_FOOTER,
    },
    subject,
  );
}

export async function sendConfirmationMail(params: {
  to: string;
  brandName: string;
  confirmUrl: string;
  stats?: ListingStats | null;
  isReminder?: boolean;
}) {
  return send(params.to, confirmationEmail(params));
}

function formatReceiptWhen(iso: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(iso));
}

export type ListingReceiptParams = {
  brandName: string;
  registeredName: string;
  uen: string;
  slug: string;
  contactEmail: string;
  whatsapp?: string | null;
  whatsappTemplate?: string | null;
  summary: string;
  description: string;
  urls: UrlPair[];
  tagNames: string[];
  location: string;
  verificationPath: string;
  verificationDetail: string;
  photoCount: number;
  submittedAt: string;
  termsVersion: string;
  termsCopy: string;
};

export function listingReceiptEmail(params: ListingReceiptParams): MailContent {
  const submittedAt = formatReceiptWhen(params.submittedAt);
  const websites =
    params.urls.length > 0
      ? params.urls.map((item) => `${item.label}: ${item.url}`).join("\n")
      : "None";
  const description = params.description.trim() || "None";
  const summary = params.summary.trim() || "None";
  return mailFrom(
    {
      preheader: `Receipt for ${params.brandName}: the agreement you ticked and the details you submitted.`,
      kicker: "Listing receipt",
      heading: `Your receipt for ${params.brandName}`,
      intro: [
        `This email is your copy of the agreement you ticked when you submitted ${params.brandName} to muslimowned.sg, together with the details you sent. Keep it as proof of that submission.`,
        `Submitted ${submittedAt} (Singapore time). An admin will screen it for spam before the page goes live.`,
      ],
      sections: [
        {
          title: "Agreement you ticked",
          rows: [
            { label: "Checkbox", value: "Ticked — I agree to the statement below" },
            { label: "Terms version", value: params.termsVersion },
            { label: "When", value: submittedAt },
          ],
          quote: params.termsCopy,
          note: "This is the exact statement shown next to the checkbox on the submit form.",
        },
        {
          title: "Details you submitted",
          rows: [
            { label: "Brand name", value: params.brandName },
            { label: "Registered company name", value: params.registeredName },
            { label: "UEN", value: params.uen },
            { label: "Public page", value: "Assigned from the brand name when an admin approves this listing. If that link is already used, we add -2, -3, and so on." },
            { label: "Public contact email", value: params.contactEmail },
            { label: "WhatsApp", value: params.whatsapp ? formatWhatsappDisplay(params.whatsapp) : "None" },
            {
              label: "WhatsApp opening message",
              value: params.whatsappTemplate || "None",
            },
            { label: "Short introduction", value: summary },
            { label: "Longer description", value: description },
            { label: "Websites", value: websites },
            {
              label: "Tags",
              value: params.tagNames.length ? params.tagNames.join(", ") : "None",
            },
            { label: "Business address", value: params.location },
            { label: "Photos", value: String(params.photoCount) },
            { label: "How you asked us to screen this", value: params.verificationPath },
            { label: "Screening detail", value: params.verificationDetail },
          ],
        },
      ],
      cta: { href: `${siteUrl()}/app`, label: "Open your listings" },
      outro: [
        "If any of these details are wrong, sign in and edit the listing before it is published, or write to us.",
      ],
      footer: DIRECTORY_FOOTER,
    },
    `Receipt: you submitted ${params.brandName} to muslimowned.sg`,
  );
}

export async function sendListingReceiptMail(
  params: ListingReceiptParams & { to: string | string[] },
) {
  const { to, ...mail } = params;
  return send(to, listingReceiptEmail(mail));
}
