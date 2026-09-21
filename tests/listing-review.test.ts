import { describe, expect, it } from "vitest";
import { listingNeedsReview, listingSlugReserved, ownerIdentityLocked } from "@/lib/listing-review";

const current = {
  uen: "202412345A",
  registeredName: "Adil Accounting Pte Ltd",
  brandName: "Adil Accounting",
  slug: "adil-accounting",
  contactEmail: "hello@adil.sg",
};

describe("listingNeedsReview", () => {
  it("keeps photo and copy edits live when identity fields are unchanged", () => {
    expect(
      listingNeedsReview(
        {
          registeredName: "Adil Accounting Pte Ltd",
        },
        current,
      ),
    ).toBe(false);
  });

  it("does not send brand, contact, or evidence edits back for review", () => {
    expect(listingNeedsReview({ uen: "202412345A" }, current)).toBe(false);
  });

  it("treats UEN and registered name as identity changes", () => {
    expect(
      listingNeedsReview({ registeredName: "Adil Accounting LLP" }, current),
    ).toBe(true);
    expect(listingNeedsReview({ uen: "202400000B" }, current)).toBe(true);
  });
});

describe("ownerIdentityLocked", () => {
  it("locks UEN and registered name after approval", () => {
    expect(ownerIdentityLocked("live")).toBe(true);
    expect(ownerIdentityLocked("unpublished")).toBe(true);
    expect(ownerIdentityLocked("pending_activation")).toBe(true);
    expect(ownerIdentityLocked("removed")).toBe(true);
  });

  it("allows identity edits before approval", () => {
    expect(ownerIdentityLocked("pending_review")).toBe(false);
    expect(ownerIdentityLocked("draft")).toBe(false);
  });
});

describe("listingSlugReserved", () => {
  it("treats published and paused pages as occupying a public slug", () => {
    expect(listingSlugReserved("live")).toBe(true);
    expect(listingSlugReserved("unpublished")).toBe(true);
    expect(listingSlugReserved("pending_activation")).toBe(true);
  });

  it("lets pending submissions share a slug until approval", () => {
    expect(listingSlugReserved("pending_review")).toBe(false);
    expect(listingSlugReserved("draft")).toBe(false);
    expect(listingSlugReserved("removed")).toBe(false);
  });
});
