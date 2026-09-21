import { describe, expect, it } from "vitest";
import { copy, isLang, LANG_COOKIE, LANG_OPTIONS, messages, statusLabel } from "@/lib/i18n";

function keysOf(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).flatMap((key) => {
    const child = (value as Record<string, unknown>)[key];
    const nested = keysOf(child).map((item) => `${key}.${item}`);
    return [key, ...nested];
  });
}

describe("i18n", () => {
  it("recognises English, Malay, Mandarin, and Tamil", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("ms")).toBe(true);
    expect(isLang("zh")).toBe(true);
    expect(isLang("ta")).toBe(true);
    expect(isLang("id")).toBe(false);
    expect(LANG_COOKIE).toBe("mosg_lang");
    expect(copy("en").skip).toBe("Skip to content");
    expect(copy("en").nav.chinese).toBe("中文");
    expect(copy("en").nav.tamil).toBe("தமிழ்");
    expect(copy("ms").nav.chinese).toBe("中文");
    expect(copy("ms").nav.tamil).toBe("தமிழ்");
    expect(LANG_OPTIONS.map((item) => item.id)).toEqual(["en", "ms", "zh", "ta"]);
  });

  it("keeps the same keys in English, Malay, Mandarin, and Tamil", () => {
    expect(keysOf(messages.ms).sort()).toEqual(keysOf(messages.en).sort());
    expect(keysOf(messages.zh).sort()).toEqual(keysOf(messages.en).sort());
    expect(keysOf(messages.ta).sort()).toEqual(keysOf(messages.en).sort());
  });

  it("uses full sentences for the home lead in both languages", () => {
    expect(copy("en").home.examples).toHaveLength(12);
    expect(copy("ms").home.examples).toHaveLength(12);
    expect(copy("en").home.lead).toBe("Tell us what you need.");
    expect(copy("en").home.businessesGrowing).toBe("{n} businesses and growing.");
    expect(copy("en").home.searchesCounting).toBe("{n} searches and counting!");
    expect(copy("ms").home.lead).toBe("Beritahu kami apa yang anda perlukan.");
    expect(copy("en").add.linkedinHint.toLowerCase()).toContain("personal");
    expect(copy("en").add.linkedinHint.toLowerCase()).toContain("company");
    expect(copy("en").add.aiLead.toLowerCase()).toContain("look at the photos");
    expect(copy("en").legal.aboutBody.toLowerCase()).not.toContain("smcci");
    expect(copy("en").legal.aboutBody.toLowerCase()).not.toContain("chamber");
    expect(copy("ms").legal.aboutBody.toLowerCase()).not.toContain("smcci");
    expect(copy("en").biz.about).toBe(
      "All information, text and images are submitted by the business owner. Every change is logged with who made it. The accuracy of the listings is 100% the responsibility of the business owner. Admins screen listings only for spam, not for accuracy.",
    );
    expect(copy("en").biz.about.toLowerCase()).not.toContain("muis");
    expect(copy("en").legal.aboutBody.toLowerCase()).not.toContain("muis");
    expect(copy("en").legal.termsIndependentBody.toLowerCase()).not.toContain("muis");
    expect(copy("ms").biz.about.toLowerCase()).not.toContain("muis");
    expect(copy("en").legal.aboutTitle).toBe("About this listing");
    expect(copy("en").nav.why).toBe("List for free");
    expect(copy("ms").nav.why.toLowerCase()).toContain("percuma");
    expect(copy("en").nav.signIn).toBe("Business sign in");
    expect(copy("en").login.send).toBe("Business sign in");
    expect(copy("en").login.title).toBe("Business sign in");
    expect(copy("en").login.lead.toLowerCase()).toContain("visitors do not need");
    expect(copy("en").home.previewTitle).toBe("Muslim-owned businesses");
    expect(copy("en").footer.body).toBe("A free directory of Muslim-owned businesses in Singapore.");
    expect(copy("en").stories.title).toBe("Stories");
    expect(copy("en").home.howOwners).toHaveLength(2);
    expect(copy("en").home.howVisitors).toHaveLength(2);
    expect(copy("en").home.howOwners.map((step) => step.title)).toEqual([
      "List for free",
      "We check it is not spam",
    ]);
    expect(copy("en").home.howVisitors.map((step) => step.title)).toEqual([
      "Search or browse",
      "Get in touch",
    ]);
    expect(copy("en").home.howOwners[0]?.body.toLowerCase()).toContain("51%");
    expect(
      [...copy("en").home.howOwners, ...copy("en").home.howVisitors]
        .map((step) => `${step.title} ${step.body}`.toLowerCase())
        .join(" "),
    ).not.toContain("evidence");
    expect(copy("en").add.wizardNudges).toHaveLength(5);
    expect(copy("en").add.wizardTitles).toHaveLength(5);
    expect(copy("en").add.wizardNudges[0]?.toLowerCase()).toContain("three minutes");
    expect(copy("en").why.how).toHaveLength(3);
    expect(copy("en").legal.meaningBody).toContain("51%");
    expect(copy("en").why.howLead.toLowerCase()).toContain("spam");
    expect(copy("en").why.howLead.toLowerCase()).not.toContain("evidence");
    expect(copy("en").add.uenHint.toLowerCase()).toContain("unique entity number");
    expect(copy("en").card.demo).toBe("Demo");
    expect(copy("en").saved.view).toBe("View bookmarked");
    expect(copy("en").who.title).toBe("Who we are");
    expect(copy("en").add.aiOpen).toBe("Help fill up with AI");
    expect(copy("en").add.aiTitle).toBe("Fill from a website or photos");
    expect(copy("en").add.aiLead.toLowerCase()).toContain("or both");
    expect(copy("en").adminPage.addForOthersCta).toBe("Add for others");
    expect(copy("en").adminPage.adminsTitle).toBe("Admins");
    expect(copy("en").adminPage.adminsSelf.toLowerCase()).toContain("your own");
    expect(copy("en").app.inviteDraftLead.toLowerCase()).toContain("admin started");
    expect(copy("en").who.faces).toBe("Signed by,");
    expect(copy("en").who.p1).toContain("brothers’ and sisters’");
    expect(copy("en").who.p3.toLowerCase()).toContain("community");
    expect(copy("en").home.resultsClear).toBe("Show full directory");
    expect(copy("en").add.photosEarlier).toBe("Move earlier");
    expect(copy("en").add.photosHint.toLowerCase()).toContain("order");
    expect(copy("en").add.aiPhotosHint.toLowerCase()).toContain("brand logo");
    expect(copy("en").add.aiPhotosHint.toLowerCase()).toContain("product poster");
    expect(copy("en").add.aiPhotosHint.toLowerCase()).toContain("whatsapp");
    expect(copy("en").add.colorsPrimary).toBe("Primary colour");
    expect(copy("en").add.colors.toLowerCase()).toContain("optional");
    expect(copy("en").add.colorsSecondaryHint.toLowerCase()).toContain("not used for text");
    expect(copy("en").app.editHint.toLowerCase()).toContain("photo");
    expect(copy("en").app.editHintLocked.toLowerCase()).toContain("uen");
    expect(copy("en").biz.byAdmin).toContain("{author}");
    expect(copy("en").adminPage.editHint.toLowerCase()).toContain("logged");
    expect(copy("en").app.uniqueViews).toContain("{n} unique people");
    expect(copy("en").app.uniqueImpressions).toContain("search");
    expect(copy("ms").app.uniqueViews).toContain("{n}");
    expect(copy("en").adminPage.visitorsLead.toLowerCase()).toContain("one minute");
    expect(copy("en").adminPage.uniqueVisitors).toContain("{n}");
    expect(copy("en").adminPage.clicks).toContain("{n}");
    expect(copy("en").biz.demoNote.toLowerCase()).toContain("not a real business");
    expect(copy("ms").banner.length).toBeGreaterThan(20);
    expect(copy("en").login.sent.toLowerCase()).toContain("spam folder");
    expect(copy("en").login.emailHint.toLowerCase()).toContain("spam folder");
    expect(copy("en").add.contactHint.toLowerCase()).toContain("spam folder");
    expect(copy("en").app.receiptNotice.toLowerCase()).toContain("spam folder");
    expect(copy("en").app.pendingMail.toLowerCase()).toContain("spam folder");
    expect(copy("ms").login.sent.toLowerCase()).toContain("folder spam");
    expect(copy("en").bannerNote).toContain("mid-Oct 2026");
    expect(copy("en").biz.copyAddress).toBe("Copy");
    expect(copy("en").biz.externalLead.toLowerCase()).toContain("listing owner");
    expect(copy("en").biz.externalConfirm).toBe("Open new tab");
    expect(copy("en").add.address.toLowerCase()).toContain("optional");
    expect(copy("en").add.ownerName.toLowerCase()).toContain("owner page");
    expect(copy("en").login).not.toHaveProperty("displayName");
    expect(copy("en").add.identityLockNote.toLowerCase()).toContain("cannot be changed");
    expect(copy("en").add.urlWebsite).toBe("Website");
    expect(copy("en").add.urlInstagram).toBe("Instagram");
    expect(copy("en").add.urlsHint.toLowerCase()).toContain("leave a row blank");
    expect(copy("en").add.fileHint.toLowerCase()).toContain("admin will read");
    expect(copy("en").add.whatsapp.toLowerCase()).toContain("optional");
    expect(copy("en").add.slugHint).toContain("-2");
    expect(copy("en").add.slugHint.toLowerCase()).toContain("approves");
    expect(copy("en").add.draftSaved.toLowerCase()).toContain("draft");
    expect(copy("en").app.saved.toLowerCase()).toBe("changes saved.");
    expect(copy("en").biz.whatsapp).toBe("WhatsApp");
    expect(copy("en").biz.whatsappCta).toBe("Contact via WhatsApp");
    expect(copy("en").quickList.title).toBe("List for free in 3 minutes");
    expect(copy("en").add.acceptLegend.toLowerCase()).toContain("each sentence");
    expect(copy("en").app.rejectedLead.toLowerCase()).toContain("not published");
    expect(copy("en").app.resubmit.toLowerCase()).toContain("submit");
    expect(copy("en").adminPage.rejectNeedNote.toLowerCase()).toContain("10");
    expect(copy("en").add.foundingBody).toContain("80%");
    expect(copy("en").add.foundingBody.toLowerCase()).toContain("random pick");
    expect(copy("ms").add.foundingBody).toContain("80%");
    expect(copy("zh").add.foundingBody).toContain("80%");
    expect(copy("ta").add.foundingBody).toContain("80%");
    expect(copy("ms").home.promo).toContain("100");
    expect(copy("zh").home.promo).toContain("100");
    expect(copy("ta").home.promo).toContain("100");
    expect(copy("zh").login.title).toBe("商家登录");
    expect(copy("ta").login.title).toBe("வணிக உள்நுழைவு");
    expect(copy("zh").stories.title).toBe("故事");
    expect(copy("ta").htmlLang).toBe("ta-SG");
    expect(statusLabel("zh", "live")).toBe("已发布");
    expect(statusLabel("ta", "pending_review")).toContain("மதிப்பாய்வு");
  });

  it("labels listing status in both languages", () => {
    expect(statusLabel("en", "live")).toBe("Published");
    expect(statusLabel("ms", "unpublished")).toBe("Dihentikan seketika");
  });
});
