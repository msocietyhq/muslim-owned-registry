import { afterEach, describe, expect, it, vi } from "vitest";
import {
  googleTarget,
  needsGoogleTranslate,
  translateContent,
  translateText,
} from "@/lib/google-translate";

describe("google translate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("targets Mandarin and Tamil only", () => {
    expect(needsGoogleTranslate("zh")).toBe(true);
    expect(needsGoogleTranslate("ta")).toBe(true);
    expect(needsGoogleTranslate("ms")).toBe(false);
    expect(needsGoogleTranslate("en")).toBe(false);
    expect(googleTarget("zh")).toBe("zh-CN");
    expect(googleTarget("ta")).toBe("ta");
  });

  it("leaves English and Malay copy untouched", async () => {
    expect(await translateText("Hello neighbours.", "en")).toBe("Hello neighbours.");
    expect(await translateText("Hello neighbours.", "ms")).toBe("Hello neighbours.");
  });

  it("restores protected names after a Google response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [[["⟨0⟩ 是独立的。见 ⟨1⟩。", "MUIS is independent."]]],
      })),
    );
    const out = await translateContent("MUIS is independent. See muslimowned.sg.", "zh");
    expect(out).toContain("MUIS");
    expect(out).toContain("muslimowned.sg");
    expect(out).not.toContain("⟨");
  });
});
