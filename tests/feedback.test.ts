import { describe, expect, it } from "vitest";
import { feedbackStartSchema, feedbackVerifyUrl, GITHUB_SOURCE_URL } from "@/lib/feedback";

describe("feedback", () => {
  it("requires a real email and a note that is not a one-liner", () => {
    expect(() =>
      feedbackStartSchema.parse({ email: "not-an-email", message: "hi there this is enough text" }),
    ).toThrow();
    expect(() =>
      feedbackStartSchema.parse({ email: "owner@example.com", message: "too short" }),
    ).toThrow();
    expect(
      feedbackStartSchema.parse({
        email: "owner@example.com",
        message: "This listing for Makcik Cakes looks out of date.",
      }).email,
    ).toBe("owner@example.com");
  });

  it("builds a confirm link on the public feedback verify page", () => {
    expect(
      feedbackVerifyUrl({
        siteUrl: "https://muslimowned.sg",
        email: "owner@example.com",
        token: "abc",
      }),
    ).toBe("https://muslimowned.sg/feedback/verify?email=owner%40example.com&token=abc");
    expect(GITHUB_SOURCE_URL).toContain("muslim-owned-registry");
  });
});
