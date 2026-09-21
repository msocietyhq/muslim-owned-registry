import { describe, expect, it } from "vitest";
import { DESCRIPTION_MAX, markdownPlainText, sanitizeMarkdown } from "@/lib/markdown";

describe("listing markdown", () => {
  it("strips HTML and dangerous protocols", () => {
    expect(sanitizeMarkdown('<p>Hello</p> [x](javascript:alert(1))')).toBe("Hello [x](alert(1))");
    expect(sanitizeMarkdown("See ![logo](https://evil.example/x.png) us")).toBe("See  us");
    expect(sanitizeMarkdown("a".repeat(DESCRIPTION_MAX + 20)).length).toBe(DESCRIPTION_MAX);
  });

  it("flattens markdown for search", () => {
    expect(markdownPlainText("## Hall\nWe host **kenduri** and [cakes](https://example.sg).")).toBe(
      "Hall We host kenduri and cakes.",
    );
  });
});
