import { describe, expect, it } from "vitest";
import { agentApiDocs } from "@/lib/agent-api-docs";
import { apiKeyPrefix, hashApiToken, keyCreateAllowed, keyRevokeAllowed, newApiToken } from "@/lib/api-keys";

describe("API keys", () => {
  it("hashes a token without keeping the raw value", () => {
    const token = newApiToken();
    expect(token.startsWith("mosg_")).toBe(true);
    expect(hashApiToken(token)).toHaveLength(64);
    expect(hashApiToken(token)).not.toContain(token);
    expect(apiKeyPrefix(token).endsWith("…")).toBe(true);
  });

  it("lets an admin create either role and an owner create only an owner key", () => {
    expect(keyCreateAllowed({ actorIsAdmin: true, role: "admin" })).toBe(true);
    expect(keyCreateAllowed({ actorIsAdmin: true, role: "owner" })).toBe(true);
    expect(keyCreateAllowed({ actorIsAdmin: false, role: "owner" })).toBe(true);
    expect(keyCreateAllowed({ actorIsAdmin: false, role: "admin" })).toBe(false);
  });

  it("lets an owner revoke only their own key", () => {
    expect(keyRevokeAllowed({ actorIsAdmin: false, actorUid: "owner", keyUid: "owner" })).toBe(true);
    expect(keyRevokeAllowed({ actorIsAdmin: false, actorUid: "owner", keyUid: "other" })).toBe(false);
    expect(keyRevokeAllowed({ actorIsAdmin: true, actorUid: "admin", keyUid: "owner" })).toBe(true);
  });

  it("documents the agent entry point and the admin and owner split", () => {
    expect(agentApiDocs.startHere).toBe("GET /api/v1/docs");
    const paths = agentApiDocs.endpoints.map((item) => `${item.method} ${item.path}`);
    expect(paths).toContain("GET /api/v1/listings");
    expect(paths).toContain("PATCH /api/admin/listings");
    expect(paths).toContain("POST /api/uploads");
    expect(paths).toContain("PUT /api/businesses");
    expect(agentApiDocs.auth.note).toContain("admin key");
    expect(agentApiDocs.auth.note).toContain("owner key");
  });
});
