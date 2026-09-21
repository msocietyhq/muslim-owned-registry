import { describe, expect, it } from "vitest";
import {
  emptyListingDraft,
  isListingDraftEmpty,
  listingDraftDocId,
  listingDraftFieldsSchema,
  parseListingDraft,
} from "@/lib/listing-draft";

describe("listing drafts", () => {
  it("keeps one document id per owner", () => {
    expect(listingDraftDocId("owner-1")).toBe("owner-1");
  });

  it("treats a blank form as empty so we do not store it", () => {
    expect(isListingDraftEmpty(emptyListingDraft())).toBe(true);
    expect(
      isListingDraftEmpty({
        ...emptyListingDraft(),
        brandName: "Makcik Cakes",
      }),
    ).toBe(false);
  });

  it("parses a stored draft and drops extra fields", () => {
    const draft = parseListingDraft({
      brandName: "Makcik Cakes",
      uen: "202412345A",
      photos: ["/demo-photos/1.svg", "not-a-photo"],
      links: { website: "https://makcik.sg", instagram: "", facebook: "", tiktok: "" },
      extra: "nope",
      updatedAt: "2026-09-20T04:00:00.000Z",
    });
    expect(draft?.brandName).toBe("Makcik Cakes");
    expect(draft?.uen).toBe("202412345A");
    expect(draft?.photos).toEqual(["/demo-photos/1.svg"]);
    expect(draft?.links.website).toBe("https://makcik.sg");
    expect(draft?.updatedAt).toBe("2026-09-20T04:00:00.000Z");
    expect(draft && "extra" in draft).toBe(false);
  });

  it("rejects an oversized description", () => {
    expect(() =>
      listingDraftFieldsSchema.parse({ description: "x".repeat(9000) }),
    ).toThrow();
  });
});
