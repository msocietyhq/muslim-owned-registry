import { describe, expect, it } from "vitest";
import { publicSnapshot } from "@/lib/public-fields";

describe("publicSnapshot", () => {
  it("drops private storage and login fields", () => {
    const snap = publicSnapshot({
      brandName: "Warong",
      contactEmail: "hello@warong.sg",
      uenStoragePath: "uen/abc/file.pdf",
      email: "login@secret.sg",
      loginEmail: "login@secret.sg",
      codeHash: "abc",
    });
    expect(snap.brandName).toBe("Warong");
    expect(snap.contactEmail).toBe("hello@warong.sg");
    expect(snap.uenStoragePath).toBeUndefined();
    expect(snap.email).toBeUndefined();
    expect(snap.loginEmail).toBeUndefined();
    expect(snap.codeHash).toBeUndefined();
  });
});
