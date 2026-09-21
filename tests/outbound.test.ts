import { describe, expect, it } from "vitest";
import { isOutboundHttpUrl, outboundDomain } from "@/lib/outbound";

describe("outbound links", () => {
  it("returns the host for off-site http links and ignores our own site", () => {
    expect(outboundDomain("https://www.linkedin.com/in/m-afiq")).toBe("www.linkedin.com");
    expect(outboundDomain("https://wa.me/6591234567")).toBe("wa.me");
    expect(outboundDomain("https://muslimowned.sg/biz/playtours")).toBeNull();
    expect(outboundDomain("/owner/afiq")).toBeNull();
    expect(outboundDomain("mailto:hello@playtours.app")).toBeNull();
    expect(isOutboundHttpUrl("https://playtours.app")).toBe(true);
    expect(isOutboundHttpUrl("tel:+6591234567")).toBe(false);
  });
});
