// Subscription detection (spec 4.10): same merchant, similar amount (±10%), regular interval, at least 2 times.
import { addDays, addMonths, dayOfMonth, daysBetween, type IsoDate, nextDueDate } from "./dates";
import type { Interval, Subscription, Transaction } from "./types";

// Gap windows in days. Months run 28–31 days, plus a few days of billing drift.
const CADENCE: [Interval, number, number][] = [
  ["week", 6, 8],
  ["month", 27, 33],
  ["year", 358, 372],
];

const merchantKey = (label: string) => label.toLowerCase().replace(/\s+/g, " ").trim();

// ponytail: every charge from a merchant must fit the pattern, so one odd purchase at the same
// merchant hides the subscription. Look at the longest regular run if that turns out to matter.
export function detectSubscriptions(txns: Transaction[]): Subscription[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = merchantKey(t.label);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const found: Subscription[] = [];
  for (const group of groups.values()) {
    const charges = [...group].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (charges.length < 2) continue;
    const last = charges[charges.length - 1];
    if (!charges.every((c) => Math.abs(c.cents - last.cents) * 10 <= last.cents)) continue;
    const gaps = charges.slice(1).map((c, i) => daysBetween(charges[i].date, c.date));
    const interval = CADENCE.find(([, lo, hi]) => gaps.every((g) => g >= lo && g <= hi))?.[0];
    if (!interval) continue;
    // Monthly bills keep their latest day of month, so charges on Jan 31, Feb 28 predict Mar 31.
    const nextDate =
      interval === "week"
        ? addDays(last.date, 7)
        : interval === "month"
          ? nextDueDate(Math.max(...charges.map((c) => dayOfMonth(c.date))), addDays(last.date, 1))
          : addMonths(last.date, 12);
    found.push({ merchant: last.label, cents: last.cents, interval, nextDate, confirmed: false });
  }
  return found;
}

// k-th renewal after `nextDate`, counted from nextDate itself so month-end dates don't drift.
const renewal = (s: Subscription, k: number) =>
  s.interval === "week" ? addDays(s.nextDate, 7 * k) : addMonths(s.nextDate, s.interval === "year" ? 12 * k : k);

// Confirmed renewals from today up to `before` (exclusive); they count as fixed bills in safe to spend.
export function subscriptionsDue(subs: Subscription[], today: IsoDate, before: IsoDate): number {
  let sum = 0;
  for (const s of subs) {
    if (!s.confirmed) continue;
    for (let k = 0, d = s.nextDate; d < before; d = renewal(s, ++k)) if (d >= today) sum += s.cents;
  }
  return sum;
}

// "You pay $34/month in subscriptions": confirmed ones, as a monthly figure in cents (rounded).
export function monthlySubscriptionCost(subs: Subscription[]): number {
  const perYear = { week: 52, month: 12, year: 1 };
  return Math.round(subs.reduce((sum, s) => (s.confirmed ? sum + s.cents * perYear[s.interval] : sum), 0) / 12);
}
