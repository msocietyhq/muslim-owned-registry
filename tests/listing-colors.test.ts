import { describe, expect, it } from "vitest";
import {
  listingBrandProps,
  listingColorsFromInput,
  onColor,
  parseCssColor,
  cssValueToHex,
  extractPageColorHints,
  pickListingColors,
} from "@/lib/listing-colors";

describe("listing colours", () => {
  it("accepts 3-digit and 6-digit hex, and rejects junk", () => {
    expect(parseCssColor("#0C3F32")).toBe("#0c3f32");
    expect(parseCssColor("c4a")).toBe("#cc44aa");
    expect(parseCssColor("not-a-color")).toBeNull();
    expect(parseCssColor("")).toBeNull();
  });

  it("uses defaults when nothing is set, and drops a secondary colour without a primary", () => {
    expect(listingColorsFromInput("", "")).toEqual({ primaryColor: null, secondaryColor: null });
    expect(listingColorsFromInput(null, "#c4a35a")).toEqual({
      primaryColor: null,
      secondaryColor: null,
    });
    expect(listingColorsFromInput("#0c3f32", "")).toEqual({
      primaryColor: "#0c3f32",
      secondaryColor: null,
    });
    expect(listingColorsFromInput("#0c3f32", "#c4a35a")).toEqual({
      primaryColor: "#0c3f32",
      secondaryColor: "#c4a35a",
    });
  });

  it("picks dark text on a light primary colour", () => {
    expect(onColor("#f4efe4")).toBe("#122821");
    expect(onColor("#0c3f32")).toBe("#fffdf8");
  });

  it("only emits CSS variables for colours that were chosen", () => {
    expect(listingBrandProps({ primaryColor: null, secondaryColor: null })).toEqual({});
    const primaryOnly = listingBrandProps({ primaryColor: "#0c3f32", secondaryColor: null });
    expect(primaryOnly["data-has-primary"]).toBe("1");
    expect(primaryOnly["data-has-secondary"]).toBeUndefined();
    expect(primaryOnly.style).toMatchObject({ "--listing-primary": "#0c3f32" });
    const both = listingBrandProps({ primaryColor: "#0c3f32", secondaryColor: "#c4a35a" });
    expect(both["data-has-secondary"]).toBe("1");
    expect(both.style).toMatchObject({
      "--listing-primary": "#0c3f32",
      "--listing-secondary": "#c4a35a",
    });
  });

  it("reads theme-color and CSS brand variables, and ignores invented colours", () => {
    const hints = extractPageColorHints(`
      <html>
        <head>
          <meta name="theme-color" content="#5B21B6" />
          <style>
            :root { --brand-primary: #5b21b6; --accent: #f59e0b; --page: #ffffff; --ink: #111111; }
            body { color: rgb(17, 17, 17); background: #fff; }
          </style>
        </head>
      </html>
    `);
    expect(hints.themeColor).toBe("#5b21b6");
    expect(hints.palette).toContain("#5b21b6");
    expect(hints.palette).toContain("#f59e0b");
    expect(hints.palette).not.toContain("#ffffff");
    const picked = pickListingColors(hints);
    expect(picked.primaryColor).toBe("#5b21b6");
    expect(picked.secondaryColor).toBe("#f59e0b");
    const fromModel = pickListingColors(hints, {
      primaryColor: "#ff00ff",
      secondaryColor: "#00ff00",
    });
    expect(fromModel.primaryColor).toBe("#5b21b6");
    expect(fromModel.secondaryColor).toBe("#f59e0b");
    const fromPhotos = pickListingColors(
      hints,
      { primaryColor: "#e11d48", secondaryColor: "#f59e0b" },
      { allowPreferred: true },
    );
    expect(fromPhotos.primaryColor).toBe("#e11d48");
    expect(fromPhotos.secondaryColor).toBe("#f59e0b");
  });

  it("converts rgb and 3-digit hex, and skips a second colour that is too similar", () => {
    expect(cssValueToHex("rgb(91, 33, 182)")).toBe("#5b21b6");
    expect(cssValueToHex("#f90")).toBe("#ff9900");
    const picked = pickListingColors({
      themeColor: "#5b21b6",
      palette: ["#5b21b6", "#6d28d9"],
    });
    expect(picked.primaryColor).toBe("#5b21b6");
    expect(picked.secondaryColor).toBe("");
  });
});
