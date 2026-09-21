import { describe, expect, it } from "vitest";
import {
  confirmationEmail,
  fromAddress,
  listQuickEmail,
  listingInviteEmail,
  listingLiveEmail,
  listingReceiptEmail,
  listingRejectedEmail,
  loginEmail,
} from "@/lib/email";
import { TERMS_COPY } from "@/lib/legal";
import { TERMS_VERSION } from "@/lib/types";
import {
  EMAIL_COLORS,
  escapeHtml,
  formatEmailCount,
  hasListingTraffic,
} from "@/lib/email-layout";

describe("owner emails", () => {
  it("reads the From address from MAIL_FROM", () => {
    const previous = process.env.MAIL_FROM;
    process.env.MAIL_FROM = "Example <mail@example.com>";
    try {
      expect(fromAddress()).toBe("Example <mail@example.com>");
    } finally {
      if (previous === undefined) delete process.env.MAIL_FROM;
      else process.env.MAIL_FROM = previous;
    }
  });

  it("escapes HTML in listing names", () => {
    expect(escapeHtml(`Makcik <script> & "Cakes"`)).toBe(
      "Makcik &lt;script&gt; &amp; &quot;Cakes&quot;",
    );
  });

  it("formats counts the way the site does", () => {
    expect(formatEmailCount(1040)).toBe("1,040");
    expect(hasListingTraffic({ uniqueViews: 0, uniqueImpressions: 0, clicks: 0 })).toBe(
      false,
    );
    expect(hasListingTraffic({ uniqueViews: 2, uniqueImpressions: 0, clicks: 0 })).toBe(
      true,
    );
  });

  it("puts unique listing stats on the first confirmation and the reminder", () => {
    const stats = { uniqueViews: 12, uniqueImpressions: 48, clicks: 20 };
    const first = confirmationEmail({
      brandName: "Makcik Cakes",
      confirmUrl: "https://muslimowned.sg/m/token",
      stats,
    });
    const reminder = confirmationEmail({
      brandName: "Makcik Cakes",
      confirmUrl: "https://muslimowned.sg/m/token",
      stats,
      isReminder: true,
    });

    expect(first.subject).toContain("Please confirm");
    expect(reminder.subject).toContain("Reminder");
    for (const mail of [first, reminder]) {
      expect(mail.html).toContain(EMAIL_COLORS.mihrab);
      expect(mail.html).toContain(EMAIL_COLORS.gold);
      expect(mail.html).toContain("12");
      expect(mail.html).toContain("unique people opened your page");
      expect(mail.html).toContain("48");
      expect(mail.html).toContain("unique people saw you in search");
      expect(mail.html).toContain("https://muslimowned.sg/m/token");
      expect(mail.text).toContain("12 unique people opened your page");
      expect(mail.text).toContain("48 unique people saw you in search");
      expect(mail.text).toContain("20 times your page was opened");
      expect(mail.html.toLowerCase()).not.toContain("login email");
    }
  });

  it("keeps a matching layout on every other mail", () => {
    const login = loginEmail({
      code: "123456",
      magicUrl: "https://muslimowned.sg/login/verify?email=a@b.sg&token=x",
    });
    const live = listingLiveEmail({
      brandName: "Makcik Cakes",
      slug: "makcik-cakes",
    });
    const rejected = listingRejectedEmail({
      brandName: 'Warong <b>Ali</b>',
      listingId: "11111111-1111-4111-8111-111111111111",
      note: "Please send a clearer UEN file.",
    });
    const receipt = listingReceiptEmail({
      brandName: 'Makcik <b>Cakes</b>',
      registeredName: "Makcik Cakes Pte. Ltd.",
      uen: "202412345A",
      slug: "makcik-cakes",
      contactEmail: "hello@makcik.sg",
      summary: "Kenduri cakes from a Jurong West kitchen.",
      description: "Buttercream cakes for twelve to forty slices.",
      urls: [{ url: "https://makcik.sg", label: "Website" }],
      tagNames: ["Bakery", "Catering"],
      location: "Pinned on OpenStreetMap (1.3396, 103.7063)",
      verificationPath: "UEN document downloaded in the last year",
      verificationDetail: "Download date on the file: 2026-08-01",
      photoCount: 3,
      submittedAt: "2026-09-20T04:00:00.000Z",
      termsVersion: TERMS_VERSION,
      termsCopy: TERMS_COPY,
    });

    expect(
      listQuickEmail({
        code: "654321",
        magicUrl: "https://muslimowned.sg/list-for-free-in-3-minutes/verify?email=a@b.sg&token=x",
        brandName: "Makcik Cakes",
      }).html,
    ).toContain("7 days");
    expect(
      listingInviteEmail({
        brandName: "PlayTours",
        openUrl: "https://muslimowned.sg/login/verify?email=owner@playtours.app&token=x&next=/app/businesses/abc",
      }).html,
    ).toContain("7 days");
    expect(login.html).toContain("123456");
    expect(login.html).toContain(EMAIL_COLORS.mihrab);
    expect(live.html).toContain("approved and live");
    expect(live.html).toContain("You do not need to publish it again");
    expect(live.html).not.toContain("Activate this listing");
    expect(live.html).toContain("/biz/makcik-cakes");
    expect(live.html).toContain("/logo.png");
    expect(live.html).not.toContain("How people found you");
    expect(live.html).not.toContain("unique people");
    expect(rejected.html).toContain("Warong &lt;b&gt;Ali&lt;/b&gt;");
    expect(rejected.html).not.toContain("<b>Ali</b>");
    expect(rejected.html).toContain("Please send a clearer UEN file.");
    expect(rejected.html).toContain("/app/businesses/11111111-1111-4111-8111-111111111111");
    expect(rejected.html.toLowerCase()).toContain("edit and submit");
    expect(receipt.html).toContain("Your receipt for Makcik &lt;b&gt;Cakes&lt;/b&gt;");
    expect(receipt.html).not.toContain("<b>Cakes</b>");
    expect(receipt.html).toContain("202412345A");
    expect(receipt.html).toContain("Ticked");
    expect(receipt.html).toContain(TERMS_COPY.slice(0, 80));
    expect(receipt.html).toContain("I am responsible for the accuracy of this listing.");
    expect(receipt.html).toContain("when an admin approves");
    expect(receipt.html).toContain("-2, -3");
    expect(receipt.html).not.toContain("How people found you");
    expect(receipt.text).toContain("Agreement you ticked");
    expect(receipt.text).toContain(TERMS_COPY);
    const invite = listingInviteEmail({
      brandName: "PlayTours",
      openUrl: "https://muslimowned.sg/login/verify?email=owner@playtours.app&token=x&next=/app/businesses/abc",
    });
    expect(invite.html).toContain("next=/app/businesses/abc");
    expect(invite.html).toContain("Please review PlayTours");
    for (const mail of [login, live, rejected, receipt, invite]) {
      expect(mail.html).toContain("muslimowned.sg");
      expect(mail.html).toContain("border-radius:999px");
    }
  });
});
