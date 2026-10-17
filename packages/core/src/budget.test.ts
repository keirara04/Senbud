import { describe, expect, it } from "vitest";
import {
  aheadOfPace,
  billCountdown,
  budgetStatus,
  categoryBudgets,
  leftover,
  periodRange,
  safeToSpend,
  untilPeriod,
  treatNudge,
  treatsInJar,
} from "./budget";
import type { Bill, BudgetPeriod, Transaction } from "./types";

const tx = (date: string, cents: number, category: Transaction["category"] = "Food"): Transaction => ({
  date,
  cents,
  label: "x",
  category,
});

describe("periodRange", () => {
  // 2026-10-16 is a Friday.
  it("finds the week containing today", () => {
    expect(periodRange({ kind: "week", startWeekday: 1 }, "2026-10-16")).toEqual({ start: "2026-10-12", nextStart: "2026-10-19" });
    expect(periodRange({ kind: "week", startWeekday: 5 }, "2026-10-16")).toEqual({ start: "2026-10-16", nextStart: "2026-10-23" });
    expect(periodRange({ kind: "week", startWeekday: 6 }, "2026-10-16")).toEqual({ start: "2026-10-10", nextStart: "2026-10-17" });
  });
  it("finds the month containing today, across years and short months", () => {
    expect(periodRange({ kind: "month", startDay: 1 }, "2026-10-16")).toEqual({ start: "2026-10-01", nextStart: "2026-11-01" });
    expect(periodRange({ kind: "month", startDay: 25 }, "2026-01-16")).toEqual({ start: "2025-12-25", nextStart: "2026-01-25" });
    expect(periodRange({ kind: "month", startDay: 31 }, "2027-03-15")).toEqual({ start: "2027-02-28", nextStart: "2027-03-31" });
    expect(periodRange({ kind: "month", startDay: 31 }, "2027-02-10")).toEqual({ start: "2027-01-31", nextStart: "2027-02-28" });
  });
  it("runs until payday", () => {
    expect(periodRange({ kind: "until", start: "2026-10-10", payday: "2026-10-25" }, "2026-10-16")).toEqual({
      start: "2026-10-10",
      nextStart: "2026-10-25",
    });
  });
});

describe("untilPeriod", () => {
  const month: BudgetPeriod = { kind: "month", startDay: 1 };
  it("starts a new until budget today, ending on the next payday", () => {
    expect(untilPeriod(month, 27, "2026-10-17")).toEqual({ kind: "until", start: "2026-10-17", payday: "2026-10-27" });
    expect(untilPeriod(month, 17, "2026-10-17")).toEqual({ kind: "until", start: "2026-10-17", payday: "2026-11-17" });
  });
  it("keeps the current period's start when re-saved after payday, so its spending still counts", () => {
    const old: BudgetPeriod = { kind: "until", start: "2026-10-17", payday: "2026-10-27" };
    expect(untilPeriod(old, 25, "2026-10-30")).toEqual({ kind: "until", start: "2026-10-27", payday: "2026-11-25" });
  });
});

describe("safeToSpend", () => {
  const month: BudgetPeriod = { kind: "month", startDay: 1 };
  const rent: Bill = { name: "Rent", cents: 65_000, dueDay: 25 };
  const txns = [tx("2026-09-30", 9_999), tx("2026-10-02", 20_000), tx("2026-10-16", 10_000), tx("2026-11-01", 9_999)];
  const base = { limit: 100_000, period: month, transactions: txns, bills: [rent], today: "2026-10-16" };

  it("sets rent aside and splits the rest over the days left, today included", () => {
    expect(safeToSpend(base)).toMatchObject({ spent: 30_000, upcoming: 65_000, left: 5_000, daysLeft: 16, covered: true });
    // 10,000 of it was spent today: 15,000 over 16 days is 937, already used up today.
    expect(safeToSpend(base)).toMatchObject({ spentToday: 10_000, perDay: 0 });
    expect(safeToSpend({ ...base, transactions: txns.filter((t) => t.date !== "2026-10-16") }).perDay).toBe(937);
  });
  it("takes what was spent today off today's number", () => {
    const day = { limit: 100_000, period: month, bills: [], today: "2026-10-17" };
    expect(safeToSpend({ ...day, transactions: [tx("2026-10-17", 1_850)] })).toMatchObject({ daysLeft: 15, left: 98_150, perDay: 4_816 });
    expect(safeToSpend({ ...day, transactions: [tx("2026-10-17", 1_850)], today: "2026-10-18" }).perDay).toBe(7_010);
  });
  it("keeps rent owed after its due date passes, so the number doesn't jump", () => {
    const r = { limit: 200_000, period: month, transactions: [], bills: [{ ...rent, dueDay: 5 }] };
    expect(safeToSpend({ ...r, today: "2026-10-05" })).toMatchObject({ owed: 65_000, upcoming: 65_000, perDay: 5_000 });
    expect(safeToSpend({ ...r, today: "2026-10-06" })).toMatchObject({ owed: 65_000, upcoming: 0, perDay: 5_192 });
  });
  it("doesn't count rent that fell due before the bill was added", () => {
    // Joined 17 Oct, 1,000 a month, rent 600 due the 1st: the next rent is next period's.
    const r = safeToSpend({ limit: 100_000, period: month, transactions: [], bills: [{ ...rent, cents: 60_000, dueDay: 1, addedOn: "2026-10-17" }], today: "2026-10-17" });
    expect(r).toMatchObject({ owed: 0, left: 100_000, daysLeft: 15, perDay: 6_666 });
    // Added before the 5th: owed all period.
    const due5 = { limit: 200_000, period: month, transactions: [], bills: [{ ...rent, dueDay: 5, addedOn: "2026-10-02" }] };
    expect(safeToSpend({ ...due5, today: "2026-10-20" }).owed).toBe(65_000);
  });
  it("doesn't count a renewal twice once it's logged on the day", () => {
    const sub = { merchant: "Netflix", cents: 1_500, interval: "month" as const, nextDate: "2026-10-10", confirmed: true };
    const r = { limit: 200_000, period: month, bills: [], subscriptions: [sub], today: "2026-10-10" };
    expect(safeToSpend({ ...r, transactions: [] })).toMatchObject({ upcoming: 1_500, left: 198_500 });
    expect(safeToSpend({ ...r, transactions: [{ ...tx("2026-10-10", 1_500, "Subscription"), label: "netflix " }] })).toMatchObject({ spent: 1_500, upcoming: 0, left: 198_500 });
  });
  it("stops counting rent once it's paid (and logged as spending)", () => {
    const paid = { ...base, bills: [{ ...rent, paidThrough: "2026-10-25" }], transactions: [...txns, tx("2026-10-16", 65_000, "Other")] };
    expect(safeToSpend(paid)).toMatchObject({ spent: 95_000, upcoming: 0, left: 5_000 });
  });
  it("counts a bill due today, but not one due on the next period's first day", () => {
    expect(safeToSpend({ ...base, bills: [{ ...rent, dueDay: 16 }] }).upcoming).toBe(65_000);
    expect(safeToSpend({ ...base, bills: [{ ...rent, dueDay: 1 }] }).upcoming).toBe(0);
  });
  it("gives the whole remainder on the last day", () => {
    expect(safeToSpend({ ...base, bills: [], today: "2026-10-31" })).toMatchObject({ daysLeft: 1, perDay: 70_000 });
  });
  it("never goes negative when over budget or short for rent", () => {
    const r = safeToSpend({ ...base, limit: 80_000 });
    expect(r).toMatchObject({ left: -15_000, perDay: 0, covered: false });
  });
  it("counts every rent inside a long until-payday period", () => {
    const until: BudgetPeriod = { kind: "until", start: "2026-10-10", payday: "2026-12-05" };
    expect(safeToSpend({ ...base, period: until, bills: [{ ...rent, dueDay: 15 }], today: "2026-10-12" }).upcoming).toBe(130_000);
  });
  // Audit bug: after payday, daysLeft was 1 and the whole budget became today's number.
  it("rolls an until-payday budget on at the same length once payday passes", () => {
    const until: BudgetPeriod = { kind: "until", start: "2026-10-01", payday: "2026-10-10" };
    const r = safeToSpend({ ...base, limit: 9_000, period: until, bills: [], transactions: [], today: "2026-10-16" });
    expect(r).toMatchObject({ start: "2026-10-10", nextStart: "2026-10-19", daysLeft: 3, perDay: 3_000 });
  });
  // Audit bug: before the start date, daysLeft counted days that weren't in the period.
  it("puts a day before an until budget's start in the period before it", () => {
    const until: BudgetPeriod = { kind: "until", start: "2026-10-20", payday: "2026-10-30" };
    expect(safeToSpend({ ...base, period: until, bills: [], today: "2026-10-16" })).toMatchObject({ start: "2026-10-10", daysLeft: 4 });
  });
  it("counts confirmed subscriptions renewing this period as bills", () => {
    const sub = { merchant: "Spotify", cents: 1_199, interval: "month" as const, nextDate: "2026-10-20", confirmed: true };
    expect(safeToSpend({ ...base, subscriptions: [sub, { ...sub, confirmed: false }] }).upcoming).toBe(65_000 + 1_199);
  });
});

describe("billCountdown", () => {
  const rent: Bill = { name: "Rent", cents: 65_000, dueDay: 25 };
  it("counts days to the next due date", () => {
    expect(billCountdown(rent, "2026-10-16")).toEqual({ due: "2026-10-25", days: 9 });
    expect(billCountdown(rent, "2026-10-25")).toEqual({ due: "2026-10-25", days: 0 });
    expect(billCountdown(rent, "2026-10-26")).toEqual({ due: "2026-11-25", days: 30 });
  });
  it("handles month-end due days", () => {
    expect(billCountdown({ ...rent, dueDay: 31 }, "2027-02-01")).toEqual({ due: "2027-02-28", days: 27 });
    expect(billCountdown({ ...rent, dueDay: 31 }, "2028-02-01")).toEqual({ due: "2028-02-29", days: 28 });
    expect(billCountdown({ ...rent, dueDay: 31 }, "2027-03-01")).toEqual({ due: "2027-03-31", days: 30 });
  });
  it("skips to next month once paid", () => {
    expect(billCountdown({ ...rent, paidThrough: "2026-10-20" }, "2026-10-16").due).toBe("2026-10-25");
    expect(billCountdown({ ...rent, paidThrough: "2026-10-25" }, "2026-10-16")).toEqual({ due: "2026-11-25", days: 40 });
  });
});

describe("budget status", () => {
  it("is ok, close from 90%, over past the limit", () => {
    expect([0, 89, 90, 100, 101].map((s) => budgetStatus(s, 100))).toEqual(["ok", "ok", "close", "close", "over"]);
    expect([budgetStatus(0, 0), budgetStatus(1, 0)]).toEqual(["ok", "over"]);
  });
  it("flags spending ahead of time elapsed", () => {
    const week = { start: "2026-10-12", nextStart: "2026-10-19" };
    expect(aheadOfPace(7_000, 10_000, week, "2026-10-14")).toBe(true); // $70 gone by Wednesday
    expect(aheadOfPace(4_000, 10_000, week, "2026-10-14")).toBe(false);
    expect(aheadOfPace(10_000, 10_000, week, "2026-10-18")).toBe(false);
    // Audit bug: true before an until budget's start. That day now belongs to the period before.
    const until: BudgetPeriod = { kind: "until", start: "2026-10-20", payday: "2026-10-30" };
    expect(aheadOfPace(0, 10_000, periodRange(until, "2026-10-16"), "2026-10-16")).toBe(false);
  });
  it("sums each category within the period", () => {
    const range = { start: "2026-10-01", nextStart: "2026-11-01" };
    const txns = [tx("2026-10-02", 9_500), tx("2026-09-30", 5_000), tx("2026-10-03", 2_000, "Transport")];
    expect(categoryBudgets(txns, { Food: 10_000, Treat: 3_000 }, range)).toEqual([
      { category: "Food", spent: 9_500, limit: 10_000, status: "close" },
      { category: "Treat", spent: 0, limit: 3_000, status: "ok" },
    ]);
  });
});

describe("treat jar", () => {
  it("rolls in only underspend", () => {
    expect(leftover(10_000, 7_700)).toBe(2_300);
    expect(leftover(10_000, 12_000)).toBe(0);
  });
  it("counts whole treats in the jar", () => {
    expect(treatsInJar(2_300, 599)).toBe(3);
    expect(treatsInJar(2_300, 0)).toBe(0);
    expect(treatsInJar(-100, 599)).toBe(0);
  });
  it("nudges only when the treat fits, rent is covered and enough days passed", () => {
    const bigMac = { name: "Big Mac", lastCents: 599, lastDate: "2026-09-25", minDaysBetween: 14 };
    const fine = { perDay: 1_000, covered: true };
    expect(treatNudge(bigMac, fine, "2026-10-16")).toBe(true);
    expect(treatNudge({ ...bigMac, lastDate: undefined }, fine, "2026-10-16")).toBe(true);
    expect(treatNudge(bigMac, { ...fine, perDay: 598 }, "2026-10-16")).toBe(false);
    expect(treatNudge(bigMac, { ...fine, covered: false }, "2026-10-16")).toBe(false);
    expect(treatNudge({ ...bigMac, lastDate: "2026-10-10" }, fine, "2026-10-16")).toBe(false);
  });
});
