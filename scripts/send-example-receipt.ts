import { listingReceiptEmail } from "../src/lib/email";
import { TERMS_COPY } from "../src/lib/legal";
import { TERMS_VERSION } from "../src/lib/types";

async function main() {
  const to = process.argv[2] || "afiq980@gmail.com";
  const from = process.env.MAIL_FROM;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is missing.");
  }
  if (!from) {
    throw new Error("MAIL_FROM is missing.");
  }

  process.env.NEXT_PUBLIC_SITE_URL ||= "https://muslimowned.sg";
  const mail = listingReceiptEmail({
    brandName: "Makcik Cakes",
    registeredName: "Makcik Cakes Pte. Ltd.",
    uen: "202412345A",
    slug: "makcik-cakes",
    contactEmail: "hello@makcik.sg",
    summary: "Kenduri cakes from a Jurong West kitchen.",
    description:
      "Buttercream cakes for twelve to forty slices. We bake for birthdays, kenduri, and office trays.",
    urls: [
      { url: "https://makcik.sg", label: "Website" },
      { url: "https://instagram.com/makcikcakes", label: "Instagram" },
    ],
    tagNames: ["Bakery", "Catering"],
    location: "Pinned on OpenStreetMap (1.3396, 103.7063)",
    verificationPath: "UEN document downloaded in the last year",
    verificationDetail: "Download date on the file: 2026-08-01",
    photoCount: 3,
    submittedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION,
    termsCopy: TERMS_COPY,
  });

  const { Resend } = await import("resend");
  const result = await new Resend(key).emails.send({
    from,
    to,
    subject: `[Example] ${mail.subject}`,
    html: mail.html,
    text: mail.text,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  console.log(`Sent receipt example to ${to} as ${result.data?.id || "ok"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
