import { describe, expect, it } from "vitest";
import {
  aheadOfPace,
  billCountdown,
  budgetStatus,
  categoryBudgets,
  leftover,
  periodRange,
  safeToSpend,
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

describe("safeToSpend", () => {
  const month: BudgetPeriod = { kind: "month", startDay: 1 };
  const rent: Bill = { name: "Rent", cents: 65_000, dueDay: 25 };
  const txns = [tx("2026-09-30", 9_999), tx("2026-10-02", 20_000), tx("2026-10-16", 10_000), tx("2026-11-01", 9_999)];
  const base = { limit: 100_000, period: month, transactions: txns, bills: [rent], today: "2026-10-16" };

  it("sets rent aside and splits the rest over the days left, today included", () => {
    expect(safeToSpend(base)).toMatchObject({ spent: 30_000, upcoming: 65_000, left: 5_000, daysLeft: 16, perDay: 312, covered: true });
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
  it("treats a stale period (payday passed) as one day left", () => {
    const until: BudgetPeriod = { kind: "until", start: "2026-10-01", payday: "2026-10-10" };
    expect(safeToSpend({ ...base, period: until, bills: [] }).daysLeft).toBe(1);
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
