import { describe, expect, it } from "vitest";
import { formatUpdatedAgo, monthsAgo } from "@/lib/time";

describe("relative listing dates", () => {
  const copy = {
    thisMonth: "Updated this month",
    oneMonth: "Updated 1 month ago",
    monthsAgo: "Updated {n} months ago",
  };

  it("counts whole 30-day months", () => {
    const now = new Date("2026-09-18T00:00:00.000Z");
    expect(monthsAgo("2026-09-10T00:00:00.000Z", now)).toBe(0);
    expect(monthsAgo("2026-08-10T00:00:00.000Z", now)).toBe(1);
    expect(monthsAgo("2026-04-01T00:00:00.000Z", now)).toBe(5);
  });

  it("formats visitor copy", () => {
    const now = new Date("2026-09-18T00:00:00.000Z");
    expect(formatUpdatedAgo("2026-09-01T00:00:00.000Z", copy, now)).toBe("Updated this month");
    expect(formatUpdatedAgo("2026-08-10T00:00:00.000Z", copy, now)).toBe("Updated 1 month ago");
    expect(formatUpdatedAgo("2026-04-01T00:00:00.000Z", copy, now)).toBe("Updated 5 months ago");
  });
});
