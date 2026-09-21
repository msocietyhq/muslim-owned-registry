import { describe, expect, it } from "vitest";
import { confirmationSchedule, shouldSendReminder } from "@/lib/confirmation-schedule";

describe("four-month confirmation reminders", () => {
  it("starts weekly reminders seven days before due", () => {
    const { remindFrom, unpublishAt } = confirmationSchedule("2026-06-01T00:00:00.000Z");
    expect(remindFrom).toBe("2026-05-25T00:00:00.000Z");
    expect(unpublishAt).toBe("2026-06-22T00:00:00.000Z");
  });

  it("waits a week between reminders", () => {
    const remindFrom = new Date("2026-05-25T00:00:00.000Z");
    expect(shouldSendReminder(null, new Date("2026-05-24T00:00:00.000Z"), remindFrom)).toBe(false);
    expect(shouldSendReminder(null, new Date("2026-05-25T00:00:00.000Z"), remindFrom)).toBe(true);
    expect(
      shouldSendReminder(
        "2026-05-25T00:00:00.000Z",
        new Date("2026-05-31T00:00:00.000Z"),
        remindFrom,
      ),
    ).toBe(false);
    expect(
      shouldSendReminder(
        "2026-05-25T00:00:00.000Z",
        new Date("2026-06-01T00:00:00.000Z"),
        remindFrom,
      ),
    ).toBe(true);
  });
});
