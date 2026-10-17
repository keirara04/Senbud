// Local reminders (build plan phase 1): what to notify and when, worked out from data on the phone.
// The app schedules these as local notifications; nothing here reads the clock or knows the platform.
import { aheadOfPace, billDue, budgetStatus, periodRange } from "./budget";
import { addDays, daysBetween, type IsoDate, nextDueDate, weekday } from "./dates";
import { nextRenewal } from "./subscriptions";
import type { Bill, BudgetPeriod, Subscription } from "./types";

export type ReminderKind = "bills" | "renewals" | "reset" | "pace" | "checkin";
export type Reminder = { key: string; date: IsoDate; hour: number; title: string; body: string };

const EVENING = 19; // "due tomorrow" the evening before
const MORNING = 9; // "due today" on the day
const DINNER = 18; // the pace warning, before dinner is bought
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  /** This period's spending and budget, for the pace warning. */
  pace?: { spent: number; limit: number };
  /** For the weekly check-in: the last day anything was logged, the category nearest its limit (cents
   *  left, below zero when over) and the treat jar's goal, if set. */
  checkin?: { lastLogged: IsoDate | null; tightest?: { category: string; left: number }; jar?: { name: string; toGo: number } };
}): Reminder[] {
  const { kinds, bills, subscriptions, period, today, fmt, horizonDays = 62, pace, checkin } = opts;
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

  // Pace (spec 4.2): tonight only, from today's numbers. Spending only changes inside the app and every
  // change reschedules, so this is right as of the last add, and there's at most one a day. Quiet when on
  // track, and quiet when over: Home already says so, and a nightly "over" would nag.
  if (kinds.includes("pace") && pace) {
    const { spent, limit } = pace;
    const status = budgetStatus(spent, limit);
    const unit = period.kind === "until" ? "pay period" : period.kind;
    // Close to the limit but on pace (the last days of a month) stays quiet too.
    const ahead = aheadOfPace(spent, limit, periodRange(period, today), today);
    const title =
      !ahead || status === "over"
        ? null
        : status === "close"
          ? `${fmt(limit - spent)} left. Cook tonight?`
          : `${fmt(spent)} of ${fmt(limit)} gone and it's only ${WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()]}`;
    if (title) out.push({ key: `pace:${today}`, date: today, hour: DINNER, title, body: `See what's safe to spend for the rest of the ${unit}.` });
  }

  // Weekly check-in (build plan P3.7): one encouraging look at the week, at 6 pm. Sunday for week and
  // month budgets; two days before payday for until-payday ones (the reset notice has the day before).
  // Written from the numbers as of the last sync: spending only changes in the app, and a week with
  // nothing logged stays quiet, so the numbers are never stale. Only dates inside this period, so a new
  // month never gets last month's figures.
  if (kinds.includes("checkin") && pace && checkin?.lastLogged) {
    const { start, nextStart } = periodRange(period, today);
    const sunday = addDays(today, (7 - weekday(today)) % 7);
    const days = period.kind === "until" ? [addDays(nextStart, -2)] : [sunday, addDays(sunday, 7)];
    const unit = period.kind === "until" ? "pay period" : period.kind;
    for (const date of days) {
      if (date < today || date < start || date >= nextStart || checkin.lastLogged < addDays(date, -6)) continue;
      const n = daysBetween(date, nextStart);
      const left = pace.limit - pace.spent;
      const span = `${n} ${n === 1 ? "day" : "days"}`;
      const title = left >= 0 ? `${fmt(left)} left for the next ${span}` : `${fmt(-left)} over, ${span} until a fresh ${unit}`;
      const t = checkin.tightest;
      const body =
        [
          t && (t.left < 0 ? `${t.category} is ${fmt(-t.left)} over its limit.` : `${t.category} has ${fmt(t.left)} left.`),
          checkin.jar && checkin.jar.toGo > 0 && `${fmt(checkin.jar.toGo)} to go for your ${checkin.jar.name} jar.`,
        ]
          .filter(Boolean)
          .join(" ") || "Open Senbud for this week's numbers.";
      out.push({ key: `checkin:${date}`, date, hour: DINNER, title, body });
    }
  }

  // A reminder for an evening that's already past today is dropped by the app (it compares the clock).
  return out.filter((r) => r.date >= today).sort((a, b) => (a.date === b.date ? a.hour - b.hour : a.date < b.date ? -1 : 1)).slice(0, MAX);
}
