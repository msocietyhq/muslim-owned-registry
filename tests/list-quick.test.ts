import { describe, expect, it } from "vitest";
import {
  guestIdSchema,
  isListQuickUenPath,
  listQuickMagicUrl,
  LIST_QUICK_PATH,
  LIST_QUICK_VERIFY_PATH,
} from "@/lib/list-quick";

describe("list-quick helpers", () => {
  it("builds the confirm link on the new page, not /login/verify", () => {
    expect(LIST_QUICK_PATH).toBe("/list-for-free-in-3-minutes");
    expect(
      listQuickMagicUrl({
        siteUrl: "https://muslimowned.sg",
        email: "owner@example.com",
        token: "abc",
      }),
    ).toBe(
      "https://muslimowned.sg/list-for-free-in-3-minutes/verify?email=owner%40example.com&token=abc",
    );
    expect(LIST_QUICK_VERIFY_PATH).toBe("/list-for-free-in-3-minutes/verify");
  });

  it("accepts a UUID guest id and only its UEN path", () => {
    const id = "2c1f6a3e-9b44-4c11-a7d2-0f1e2d3c4b5a";
    expect(guestIdSchema.parse(id)).toBe(id);
    expect(isListQuickUenPath(`list-quick/${id}/uen/file.pdf`, id)).toBe(true);
    expect(isListQuickUenPath(`uen/${id}/new/file.pdf`, id)).toBe(false);
    expect(() => guestIdSchema.parse("not-a-uuid")).toThrow();
  });
});
