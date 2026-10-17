// The money brain: budget periods, bills, safe to spend today, category budgets and the treat jar.
import { addDays, daysBetween, type IsoDate, nextDueDate, prevDueDate, weekday } from "./dates";
import type { Category } from "./index";
import { subscriptionsDue } from "./subscriptions";
import type { Bill, BudgetPeriod, Subscription, Transaction, Treat } from "./types";

// [start, nextStart): the period that contains `today`.
export type Range = { start: IsoDate; nextStart: IsoDate };

// "until" repeats at its own length once payday passes (the app asks for the next payday meanwhile), and
// a date before `start` falls in an earlier one. So `today` is always inside its range.
export function periodRange(period: BudgetPeriod, today: IsoDate): Range {
  if (period.kind === "until") {
    const len = Math.max(1, daysBetween(period.start, period.payday));
    const start = addDays(period.start, Math.floor(daysBetween(period.start, today) / len) * len);
    return { start, nextStart: addDays(start, len) };
  }
  if (period.kind === "week") {
    const start = addDays(today, -((weekday(today) - period.startWeekday + 7) % 7));
    return { start, nextStart: addDays(start, 7) };
  }
  const start = prevDueDate(period.startDay, today);
  return { start, nextStart: nextDueDate(period.startDay, addDays(start, 1)) };
}

// An until-payday period ending on the next `paydayDay` of the month after today. Re-saving one keeps the
// current period's start, so what was spent since the last payday still counts; a new one starts today.
export function untilPeriod(old: BudgetPeriod, paydayDay: number, today: IsoDate): BudgetPeriod {
  return { kind: "until", start: old.kind === "until" ? periodRange(old, today).start : today, payday: nextDueDate(paydayDay, addDays(today, 1)) };
}

export const inRange = (date: IsoDate, { start, nextStart }: Range) => date >= start && date < nextStart;

export const spentIn = (txns: Transaction[], range: Range) =>
  txns.reduce((sum, t) => (inRange(t.date, range) ? sum + t.cents : sum), 0);

// Next unpaid due date of a monthly bill, on or after today.
export function billDue(bill: Bill, today: IsoDate): IsoDate {
  const from = bill.paidThrough && bill.paidThrough >= today ? addDays(bill.paidThrough, 1) : today;
  return nextDueDate(bill.dueDay, from);
}

// Rent countdown: "Rent $650 in 6 days". Due today = 0 days.
export function billCountdown(bill: Bill, today: IsoDate) {
  const due = billDue(bill, today);
  return { due, days: daysBetween(today, due) };
}

// Unpaid bill occurrences from today up to `before` (exclusive). A long "until" period can hold two rents.
export function billsDue(bills: Bill[], today: IsoDate, before: IsoDate): number {
  let sum = 0;
  for (const bill of bills) {
    for (let d = billDue(bill, today); d < before; d = nextDueDate(bill.dueDay, addDays(d, 1))) sum += bill.cents;
  }
  return sum;
}

// Bill occurrences owed in a range: due dates from the range start (or the day the bill was added, or
// the day after it was paid, if later) up to nextStart. One rule for Home, Wrapped and the leftover offer,
// so rent due on the 5th still counts on the 6th, and rent due before someone joined never does.
export function billsOwed(bills: Bill[], range: Range): number {
  let sum = 0;
  for (const bill of bills) {
    const paid = bill.paidThrough ? addDays(bill.paidThrough, 1) : "";
    const from = [range.start, bill.addedOn ?? "", paid].reduce((a, b) => (a > b ? a : b));
    for (let d = nextDueDate(bill.dueDay, from); d < range.nextStart; d = nextDueDate(bill.dueDay, addDays(d, 1))) sum += bill.cents;
  }
  return sum;
}

// left = budget − spent − bills owed this period − renewals still to come. `upcoming` is what's still to
// pay from today, for display. Today's number is fixed at the start of the day, then drops by what's
// spent today: perDay = floor((left + spentToday) ÷ days left, today included) − spentToday.
// perDay is never negative; `covered` says whether the bills still fit in what's left.
export function safeToSpend(opts: {
  limit: number;
  period: BudgetPeriod;
  transactions: Transaction[];
  bills: Bill[];
  subscriptions?: Subscription[];
  today: IsoDate;
}) {
  const { limit, period, transactions, bills, subscriptions = [], today } = opts;
  const range = periodRange(period, today);
  const spent = spentIn(transactions, range);
  const spentToday = spentIn(transactions, { start: today, nextStart: addDays(today, 1) });
  const owed = billsOwed(bills, range);
  const renewals = subscriptionsDue(subscriptions, today, range.nextStart, transactions);
  const upcoming = billsDue(bills, today, range.nextStart) + renewals;
  const left = limit - spent - owed - renewals;
  const daysLeft = Math.max(1, daysBetween(today, range.nextStart));
  const perDay = Math.max(0, Math.floor((left + spentToday) / daysLeft) - spentToday);
  return { ...range, spent, spentToday, owed, upcoming, left, daysLeft, perDay, covered: left >= 0 };
}

export type Status = "ok" | "close" | "over";

// "close" from 90% used (spec 4.2); exactly at the limit is still close, not over.
export function budgetStatus(spent: number, limit: number): Status {
  if (spent > limit) return "over";
  return limit > 0 && spent * 10 >= limit * 9 ? "close" : "ok";
}

// Spending runs ahead of time elapsed: "$70 of $100 gone and it's only Wednesday."
export function aheadOfPace(spent: number, limit: number, range: Range, today: IsoDate) {
  const total = daysBetween(range.start, range.nextStart);
  const elapsed = Math.min(total, daysBetween(range.start, today) + 1);
  return spent * total > limit * elapsed;
}

// A category limit can run on its own period (Pro: "Food weekly" inside a monthly budget); without one
// it follows the overall budget's.
export const categoryRange = (period: BudgetPeriod | undefined, overall: Range, today: IsoDate) => (period ? periodRange(period, today) : overall);

export function categoryBudgets(txns: Transaction[], limits: Partial<Record<Category, number>>, range: Range) {
  return (Object.entries(limits) as [Category, number][]).map(([category, limit]) => {
    const spent = spentIn(
      txns.filter((t) => t.category === category),
      range,
    );
    return { category, spent, limit, status: budgetStatus(spent, limit) };
  });
}

// Treat jar (spec 4.8): leftover budget at the end of a period can roll in.
export const leftover = (limit: number, spent: number) => Math.max(0, limit - spent);

// "Treat jar: $23 = 4 Big Macs".
export const treatsInJar = (balance: number, price: number) => (price > 0 ? Math.floor(Math.max(0, balance) / price) : 0);

// Treat nudge: the treat fits today's safe to spend, rent is covered, and it's been long enough.
export function treatNudge(treat: Treat, safe: { perDay: number; covered: boolean }, today: IsoDate) {
  const waited = !treat.lastDate || daysBetween(treat.lastDate, today) >= treat.minDaysBetween;
  return safe.covered && treat.lastCents <= safe.perDay && waited;
}

// Budgets StampLedger: 10 stamps per limit, each 10% (rounded). Over the limit, all ten fill and one
// extra "over" stamp shows outside them. No limit: nothing to stamp.
export function stamps(spent: number, limit: number | undefined) {
  if (!limit || limit <= 0) return null;
  const filled = Math.min(10, Math.round((Math.max(0, spent) / limit) * 10));
  return { filled, over: spent > limit, left: limit - spent, status: budgetStatus(spent, limit) };
}

// Treat jar fill toward its goal. Past 100% it may overflow a little (the drawing caps at 110%).
export function jarFill(balance: number, goal: number | undefined) {
  if (!goal || goal <= 0) return null;
  const share = Math.max(0, balance) / goal;
  return { share, percent: Math.min(100, Math.floor(share * 100)), reached: balance >= goal, toGo: Math.max(0, goal - balance) };
}
