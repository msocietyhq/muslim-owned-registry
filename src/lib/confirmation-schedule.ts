import { addDays } from "@/lib/crypto";
import {
  CONFIRMATION_REMINDER_DAYS,
  CONFIRMATION_UNPUBLISH_AFTER_DAYS,
} from "@/lib/types";

export function confirmationSchedule(dueAt: string) {
  return {
    remindFrom: addDays(dueAt, -CONFIRMATION_REMINDER_DAYS),
    unpublishAt: addDays(dueAt, CONFIRMATION_UNPUBLISH_AFTER_DAYS),
  };
}

export function shouldSendReminder(
  lastReminderAt: string | null | undefined,
  now: Date,
  remindFrom: Date,
) {
  if (now.getTime() < remindFrom.getTime()) return false;
  if (!lastReminderAt) return true;
  const elapsed = now.getTime() - new Date(lastReminderAt).getTime();
  return elapsed >= CONFIRMATION_REMINDER_DAYS * 86_400_000;
}
