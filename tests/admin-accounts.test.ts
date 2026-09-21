import { describe, expect, it } from "vitest";
import {
  ADMIN_SELF,
  assertCanSetAdminRole,
  mergeAdminEmails,
  normalizeAdminEmail,
} from "@/lib/admin-accounts";

describe("admin accounts", () => {
  it("normalises emails", () => {
    expect(normalizeAdminEmail("  Afiq980@Gmail.com ")).toBe("afiq980@gmail.com");
  });

  it("does not let an admin remove their own admin access", () => {
    expect(() => assertCanSetAdminRole("afiq980@gmail.com", "afiq980@gmail.com", false)).toThrow(
      ADMIN_SELF,
    );
    expect(assertCanSetAdminRole("afiq980@gmail.com", "afiq980@gmail.com", true).target).toBe(
      "afiq980@gmail.com",
    );
    expect(assertCanSetAdminRole("afiq980@gmail.com", "other@example.com", false).target).toBe(
      "other@example.com",
    );
  });

  it("lists env admins plus stored admins, and stored false wins", () => {
    expect(mergeAdminEmails(["afiq980@gmail.com"], [])).toEqual(["afiq980@gmail.com"]);
    expect(
      mergeAdminEmails(["afiq980@gmail.com"], [{ email: "helper@example.com", admin: true }]),
    ).toEqual(["afiq980@gmail.com", "helper@example.com"]);
    expect(
      mergeAdminEmails(
        ["afiq980@gmail.com"],
        [
          { email: "afiq980@gmail.com", admin: false },
          { email: "helper@example.com", admin: true },
        ],
      ),
    ).toEqual(["helper@example.com"]);
  });
});
