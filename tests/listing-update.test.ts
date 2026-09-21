import { describe, expect, it } from "vitest";
import { TERMS_CLAUSE_COUNT } from "@/lib/legal";
import { listingCreateSchema, validateEvidence } from "@/lib/listing-update";
import { HttpError } from "@/lib/http";

describe("listing create evidence", () => {
  it("accepts a UEN file without a download date", () => {
    expect(() =>
      validateEvidence({
        verificationType: "uen_document",
        uenStoragePath: "uen/owner/file.pdf",
      }),
    ).not.toThrow();
  });

  it("still requires a LinkedIn URL or a UEN file", () => {
    expect(() =>
      validateEvidence({
        verificationType: "uen_document",
        uenStoragePath: null,
      }),
    ).toThrow(HttpError);
    expect(() =>
      validateEvidence({
        verificationType: "linkedin",
        linkedinUrl: "https://example.com",
      }),
    ).toThrow(HttpError);
  });

  it("requires every agreement sentence to be ticked", () => {
    const base = {
      uen: "202412345A",
      registeredName: "Makcik Cakes Pte. Ltd.",
      brandName: "Makcik Cakes",
      contactEmail: "hello@makcik.sg",
      verificationType: "uen_document" as const,
      uenStoragePath: "uen/owner/file.pdf",
      acceptTerms: true as const,
    };
    expect(() => listingCreateSchema.parse(base)).toThrow();
    expect(
      listingCreateSchema.parse({
        ...base,
        acceptedClauseCount: TERMS_CLAUSE_COUNT,
      }).acceptedClauseCount,
    ).toBe(7);
  });
});
