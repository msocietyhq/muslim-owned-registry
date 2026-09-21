import { describe, expect, it } from "vitest";
import { LISTING_WIZARD_STEPS, wizardStepLabel } from "@/lib/listing-wizard";
import { copy } from "@/lib/i18n";

describe("listing wizard copy", () => {
  it("keeps five short pages in every language", () => {
    expect(LISTING_WIZARD_STEPS).toBe(5);
    for (const lang of ["en", "ms", "zh", "ta"] as const) {
      const add = copy(lang).add;
      expect(add.wizardTitles).toHaveLength(5);
      expect(add.wizardNudges).toHaveLength(5);
      expect(add.wizardNudges.every((line) => line.length < 80)).toBe(true);
    }
  });

  it("fills the step label", () => {
    expect(wizardStepLabel("{current} of {total}", 2, 5)).toBe("2 of 5");
  });
});
