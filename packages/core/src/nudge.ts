// Bud's notes (spec 5): what Bud says before you ask. Home's "Today" card shows the first one its own
// cards don't already cover; the Bud screen lists up to three. Ordered by how much it matters:
// a bill due within 3 days, a category running out, a renewal tomorrow, a newly spotted subscription,
// an IOU older than 7 days, an under-budget streak, then a treat when all is well. Month-end leftover has
// its own sheet and overall pace has Home's progress card, so neither is a note.
import { addDays, daysBetween, type IsoDate } from "./dates";
import { aheadOfPace, billCountdown, billsOwed, budgetStatus, periodRange, type Range, spentIn, type Status, treatNudge } from "./budget";
import { staleIous } from "./iou";
import { nextRenewal } from "./subscriptions";
import type { Category } from "./index";
import type { Bill, BudgetPeriod, Iou, Subscription, Transaction, Treat } from "./types";

export type Nudge =
  | { kind: "bill"; bill: Bill; days: number; covered: boolean }
  | { kind: "category"; category: Category; spent: number; limit: number; status: Status }
  | { kind: "renewal"; subscription: Subscription }
  | { kind: "spotted"; subscription: Subscription }
  | { kind: "iou"; iou: Iou }
  | { kind: "streak"; days: number }
  | { kind: "treat"; treat: Treat };

// One key per note, for "Not today": dismissing Food's note doesn't hide Transport's.
export const nudgeKey = (n: Nudge) =>
  n.kind === "bill"
    ? `bill:${n.bill.name}`
    : n.kind === "category"
      ? `category:${n.category}`
      : n.kind === "renewal" || n.kind === "spotted"
        ? `${n.kind}:${n.subscription.merchant}`
        : n.kind === "iou"
          ? `iou:${n.iou.friend}:${n.iou.date}`
          : n.kind === "treat"
            ? `treat:${n.treat.name}`
            : n.kind;

export type NudgeInput = {
  today: IsoDate;
  subscriptions: Subscription[];
  ious: Iou[];
  treats: Treat[];
  safe: { perDay: number; covered: boolean };
  onTrack: boolean;
  bills?: Bill[];
  limits?: Partial<Record<Category, number>>;
  txns?: Transaction[];
  range?: Range;
  spotted?: Subscription[];
  streak?: number;
};

export function nudges(opts: NudgeInput): Nudge[] {
  const { today, subscriptions, ious, treats, safe, onTrack, bills = [], limits = {}, txns = [], range, spotted = [], streak = 0 } = opts;
  const out: Nudge[] = [];
  for (const bill of bills) {
    const { days } = billCountdown(bill, today);
    if (days <= 3) out.push({ kind: "bill", bill, days, covered: safe.covered });
  }
  if (range) {
    for (const [category, limit] of Object.entries(limits) as [Category, number][]) {
      const spent = spentIn(
        txns.filter((t) => t.category === category),
        range,
      );
      const status = budgetStatus(spent, limit);
      if (limit > 0 && (status !== "ok" || aheadOfPace(spent, limit, range, today))) out.push({ kind: "category", category, spent, limit, status });
    }
  }
  const renewal = subscriptions.find((s) => s.confirmed && nextRenewal(s, today) === addDays(today, 1));
  if (renewal) out.push({ kind: "renewal", subscription: renewal });
  if (spotted[0]) out.push({ kind: "spotted", subscription: spotted[0] });
  const iou = staleIous(ious, today).find((i) => i.direction === "theyOweMe");
  if (iou) out.push({ kind: "iou", iou });
  if (streak >= 3) out.push({ kind: "streak", days: streak });
  // A treat only when nothing else needs attention.
  const treat = onTrack && !out.length ? treats.find((t) => treatNudge(t, safe, today)) : undefined;
  if (treat) out.push({ kind: "treat", treat });
  return out;
}

// Home's original single pick: renewal, IOU, then a treat.
export function pickNudge(opts: NudgeInput): Nudge | null {
  return nudges(opts)[0] ?? null;
}

// Full days before today, back to the start of this period, each spent within an even daily share of
// the budget. Today doesn't count yet: it isn't over. Nor do days before the first thing logged this
// period: an empty week before someone started using Senbud isn't a streak. Bills owed this period come
// off the budget first, the same daily share Wrapped uses.
export function underBudgetStreak(txns: Transaction[], limit: number, period: BudgetPeriod, today: IsoDate, bills: Bill[] = []): number {
  const range = periodRange(period, today);
  const logged = txns.filter((t) => t.date >= range.start).map((t) => t.date).sort()[0];
  if (!logged) return 0;
  const from = logged > range.start ? logged : range.start;
  const share = Math.max(0, limit - billsOwed(bills, range)) / daysBetween(range.start, range.nextStart);
  let days = 0;
  for (let d = addDays(today, -1); d >= from; d = addDays(d, -1)) {
    const spent = txns.filter((t) => t.date === d).reduce((s, t) => s + t.cents, 0);
    if (spent > share) break;
    days++;
  }
  return days;
}

// This period so far against the last one at the same point, and the whole of the last one.
export function compareToLast(txns: Transaction[], period: BudgetPeriod, today: IsoDate) {
  const now = periodRange(period, today);
  const last = periodRange(period, addDays(now.start, -1));
  const elapsed = Math.min(daysBetween(now.start, today) + 1, daysBetween(last.start, last.nextStart));
  return {
    now: spentIn(txns, { start: now.start, nextStart: addDays(today, 1) }),
    thenByNow: spentIn(txns, { start: last.start, nextStart: addDays(last.start, elapsed) }),
    thenTotal: spentIn(txns, last),
    day: elapsed,
    lastStart: last.start,
  };
}
