import { describe, expect, it } from "vitest";
import {
  TERMS_CLAUSE_COUNT,
  TERMS_CLAUSES,
  TERMS_COPY,
  TERMS_COPY_MS,
  TERMS_COPY_TA,
  TERMS_COPY_ZH,
  acceptedTermsCopy,
  termsCopy,
} from "@/lib/legal";

describe("consent copy", () => {
  it("explains what the listing is without stacked disclaimers", () => {
    expect(TERMS_COPY.toLowerCase()).not.toContain("not a halal certificate");
    expect(TERMS_COPY.toLowerCase()).not.toContain("not affiliated");
    expect(TERMS_COPY.toLowerCase()).not.toContain("smcci");
    expect(TERMS_COPY.toLowerCase()).not.toContain("chamber");
    expect(TERMS_COPY.toLowerCase()).not.toContain("other directories");
    expect(TERMS_COPY.toLowerCase()).not.toContain("muis");
    expect(TERMS_COPY.toLowerCase()).not.toContain("halal");
    expect(termsCopy("ms")).toContain("51%");
    expect(termsCopy("zh")).toContain("51%");
    expect(termsCopy("ta")).toContain("51%");
    expect(termsCopy("zh")).toContain("UEN");
    expect(TERMS_COPY.toLowerCase()).toContain("51%");
    expect(TERMS_COPY.toLowerCase()).toContain("i am responsible for the accuracy");
  });

  it("keeps one sentence per agreement clause in every language", () => {
    expect(TERMS_CLAUSE_COUNT).toBe(7);
    expect(TERMS_CLAUSES.en).toHaveLength(7);
    expect(TERMS_CLAUSES.ms).toHaveLength(7);
    expect(TERMS_CLAUSES.zh).toHaveLength(7);
    expect(TERMS_CLAUSES.ta).toHaveLength(7);
    expect(TERMS_CLAUSES.en.every((clause) => clause.trim().length > 20)).toBe(true);
  });

  it("uses the ticked on-screen agreement as the stored contract", () => {
    expect(acceptedTermsCopy(TERMS_COPY_MS)).toBe(TERMS_COPY_MS);
    expect(acceptedTermsCopy(TERMS_COPY_ZH)).toBe(TERMS_COPY_ZH);
    expect(acceptedTermsCopy(TERMS_COPY_TA)).toBe(TERMS_COPY_TA);
    expect(acceptedTermsCopy(TERMS_CLAUSES.en.join("\n"))).toBe(TERMS_CLAUSES.en.join("\n"));
    expect(acceptedTermsCopy("I agree to something else")).toBe(TERMS_COPY);
    expect(acceptedTermsCopy(undefined)).toBe(TERMS_COPY);
  });
});
