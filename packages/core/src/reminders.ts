// Local reminders (build plan phase 1): what to notify and when, worked out from data on the phone.
// The app schedules these as local notifications; nothing here reads the clock or knows the platform.
import { billDue, periodRange } from "./budget";
import { addDays, type IsoDate, nextDueDate } from "./dates";
import { nextRenewal } from "./subscriptions";
import type { Bill, BudgetPeriod, Subscription } from "./types";

export type ReminderKind = "bills" | "renewals" | "reset";
export type Reminder = { key: string; date: IsoDate; hour: number; title: string; body: string };

const EVENING = 19; // "due tomorrow" the evening before
const MORNING = 9; // "due today" on the day

// iOS keeps at most 64 pending local notifications and drops the rest silently; stay well under.
const MAX = 48;

export function reminderSchedule(opts: {
  kinds: ReminderKind[];
  bills: Bill[];
  subscriptions: Subscription[];
  period: BudgetPeriod;
  today: IsoDate;
  fmt: (cents: number) => string;
  horizonDays?: number;
}): Reminder[] {
  const { kinds, bills, subscriptions, period, today, fmt, horizonDays = 62 } = opts;
  // Two months, so a bill paid early still has its next due date covered if the app stays closed.
  const end = addDays(today, horizonDays);
  const out: Reminder[] = [];

  if (kinds.includes("bills")) {
    for (const bill of bills) {
      for (let d = billDue(bill, today); d < end; d = nextDueDate(bill.dueDay, addDays(d, 1))) {
        const what = `${bill.name} ${fmt(bill.cents)}`;
        out.push({ key: `bill:${bill.name}:${d}:before`, date: addDays(d, -1), hour: EVENING, title: `${what} is due tomorrow`, body: "Mark it paid in Senbud once it's done." });
        out.push({ key: `bill:${bill.name}:${d}:day`, date: d, hour: MORNING, title: `${what} is due today`, body: "Mark it paid in Senbud once it's done." });
      }
    }
  }

  if (kinds.includes("renewals")) {
    for (const s of subscriptions) {
      if (!s.confirmed) continue;
      for (let d = nextRenewal(s, addDays(today, 1)); d < end; d = nextRenewal(s, addDays(d, 1)))
        out.push({ key: `renewal:${s.merchant}:${d}`, date: addDays(d, -1), hour: EVENING, title: `${s.merchant} renews tomorrow, ${fmt(s.cents)}`, body: "Cancel before then if you don't use it." });
    }
  }

  if (kinds.includes("reset")) {
    for (let next = periodRange(period, today).nextStart; next < end; next = periodRange(period, next).nextStart)
      out.push({ key: `reset:${next}`, date: addDays(next, -1), hour: EVENING, title: "Your budget resets tomorrow", body: "See what's left before it starts again." });
  }

  // A reminder for an evening that's already past today is dropped by the app (it compares the clock).
  return out.filter((r) => r.date >= today).sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date < b.date ? -1 : 1)).slice(0, MAX);
}
