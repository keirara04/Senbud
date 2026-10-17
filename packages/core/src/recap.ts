// Looking back: the month-end leftover offer (design system 4.6) and Wrapped (spec 4.9).
import { billsOwed, inRange, leftover, periodRange, type Range, spentIn } from "./budget";
import { addDays, addMonths, daysBetween, type IsoDate } from "./dates";
import type { Category } from "./index";
import type { Bill, BudgetPeriod, Transaction } from "./types";

// The period that just ended, if Senbud hasn't settled it yet. `handled` is the start of the period
// Senbud last looked at; null means never, and the caller records the current start without asking,
// so a new install or an update never offers a month it didn't see. Until-payday budgets repeat too (see periodRange).
export function closedPeriod(period: BudgetPeriod, today: IsoDate, handled: IsoDate | null): Range | null {
  if (!handled) return null;
  const current = periodRange(period, today);
  return handled < current.start ? periodRange(period, addDays(current.start, -1)) : null;
}

// What's left of a finished period: the limit minus spending and the bills that fell due in it. Bills
// aren't logged as expenses; subscription renewals are, so those aren't taken off twice.
export const periodLeftover = (limit: number, txns: Transaction[], bills: Bill[], range: Range) =>
  leftover(limit, spentIn(txns, range) + billsOwed(bills, range));

// A calendar month, "2026-09" -> [Sep 1, Oct 1).
export const monthRange = (month: string): Range => {
  const start = `${month}-01`;
  return { start, nextStart: addMonths(start, 1) };
};

// A calendar year, "2026" -> [Jan 1, next Jan 1). Year-end Wrapped (Pro).
export const yearRange = (year: string): Range => ({ start: `${year}-01-01`, nextStart: `${Number(year) + 1}-01-01` });

// Every number on Wrapped, from local data only, for a month or a year (`month` is the range). The budget
// is the monthly limit times the months, or a weekly or until-payday limit scaled to the range's length.
// Bills owed in the range count as spent, since rent is part of the budget.
export function wrapped(opts: { txns: Transaction[]; bills: Bill[]; limit: number; period: BudgetPeriod; month: Range; today: IsoDate }) {
  const { bills, limit, period, month, today } = opts;
  const txns = opts.txns.filter((t) => inRange(t.date, month));
  const days = daysBetween(month.start, month.nextStart);
  const len = period.kind === "week" ? 7 : period.kind === "until" ? Math.max(1, daysBetween(period.start, period.payday)) : 0;
  const budget = len ? Math.round((limit * days) / len) : limit * Math.max(1, Math.round(days / 30.44));
  const spent = txns.reduce((s, t) => s + t.cents, 0);
  const billCents = billsOwed(bills, month);

  const byCategory = new Map<Category, number>();
  const places = new Map<string, { label: string; visits: number; cents: number }>();
  const byDay = new Map<IsoDate, number>();
  for (const t of txns) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.cents);
    const key = t.label.trim().toLowerCase();
    const p = places.get(key) ?? { label: t.label.trim(), visits: 0, cents: 0 };
    places.set(key, { ...p, visits: p.visits + 1, cents: p.cents + t.cents });
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.cents);
  }
  const categories = [...byCategory]
    .map(([category, cents]) => ({ category, cents, share: cents / spent }))
    .sort((a, b) => b.cents - a.cents);
  const top = [...places.values()].sort((a, b) => b.visits - a.visits || b.cents - a.cents)[0];

  // Best streak: the longest run of days that each stayed within the day's share of the budget after
  // bills. Days with no spending count. A month still running counts up to today.
  const daily = Math.max(0, budget - billCents) / days;
  const end = today < month.nextStart ? addDays(today, 1) : month.nextStart;
  let streak = 0;
  for (let d = month.start, run = 0; d < end; d = addDays(d, 1)) {
    run = (byDay.get(d) ?? 0) <= daily ? run + 1 : 0;
    streak = Math.max(streak, run);
  }

  return {
    spent,
    bills: billCents,
    budget,
    used: budget > 0 ? (spent + billCents) / budget : 0,
    saved: leftover(budget, spent + billCents),
    categories,
    topPlace: top && top.visits > 1 ? { label: top.label, visits: top.visits } : null,
    bestMonth: days > 31 ? bestMonth(txns, today) : null,
    treats: txns.filter((t) => t.category === "Treat").length,
    streak,
    days: daysBetween(month.start, end), // so far, for a month still running
  };
}

export type Wrapped = ReturnType<typeof wrapped>;

// The year's lightest month: the finished month with spending that spent least. The month still
// running would always win, so it doesn't count.
function bestMonth(txns: Transaction[], today: IsoDate) {
  const byMonth = new Map<string, number>();
  for (const t of txns) if (t.date.slice(0, 7) < today.slice(0, 7)) byMonth.set(t.date.slice(0, 7), (byMonth.get(t.date.slice(0, 7)) ?? 0) + t.cents);
  const [month, cents] = [...byMonth].sort((a, b) => a[1] - b[1])[0] ?? [];
  return month ? { month, cents: cents! } : null;
}

// "Add again" on Home (spec 4.1 favourites): things bought at least twice, most often first, then most
// recent. Each carries the latest price and category, so one tap logs it the way it was last logged.
export function favourites(txns: Transaction[], max = 4) {
  const seen = new Map<string, { label: string; cents: number; category: Category; count: number; last: IsoDate }>();
  for (const t of txns) {
    const key = t.label.trim().toLowerCase();
    const f = seen.get(key);
    if (!f) seen.set(key, { label: t.label.trim(), cents: t.cents, category: t.category, count: 1, last: t.date });
    else if (t.date > f.last) seen.set(key, { ...f, cents: t.cents, category: t.category, count: f.count + 1, last: t.date });
    else f.count++;
  }
  return [...seen.values()]
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, max)
    .map(({ label, cents, category }) => ({ label, cents, category }));
}
