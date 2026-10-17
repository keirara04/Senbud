import { describe, expect, it } from "vitest";
import { closedPeriod, favourites, monthRange, periodLeftover, wrapped } from "./index";
import type { Bill, Transaction } from "./types";

const month = { kind: "month", startDay: 1 } as const;
const tx = (date: string, cents: number, label = "Lunch", category: Transaction["category"] = "Food"): Transaction => ({ date, cents, label, category });

describe("closedPeriod", () => {
  it("never asks before a baseline is recorded", () => {
    expect(closedPeriod(month, "2026-10-01", null)).toBeNull();
  });
  it("finds the month that just ended, once", () => {
    expect(closedPeriod(month, "2026-10-01", "2026-09-01")).toEqual({ start: "2026-09-01", nextStart: "2026-10-01" });
    expect(closedPeriod(month, "2026-10-16", "2026-10-01")).toBeNull();
  });
  it("only offers the latest period after time away", () => {
    expect(closedPeriod(month, "2026-12-03", "2026-09-01")).toEqual({ start: "2026-11-01", nextStart: "2026-12-01" });
  });
  it("handles clamped start days and weeks", () => {
    // Starting on the 31st: Jan 31 to Feb 28, then Feb 28 to Mar 31.
    expect(closedPeriod({ kind: "month", startDay: 31 }, "2026-03-05", "2026-01-31")).toEqual({ start: "2026-01-31", nextStart: "2026-02-28" });
    // Weeks from Monday: Oct 12 (Mon) to Oct 19.
    expect(closedPeriod({ kind: "week", startWeekday: 1 }, "2026-10-20", "2026-10-12")).toEqual({ start: "2026-10-12", nextStart: "2026-10-19" });
  });
  it("ignores a handled start from a later period (the budget was changed)", () => {
    expect(closedPeriod(month, "2026-10-16", "2026-10-12")).toBeNull();
  });
  it("has nothing to close for an until-payday budget", () => {
    expect(closedPeriod({ kind: "until", start: "2026-10-01", payday: "2026-10-25" }, "2026-10-26", "2026-09-01")).toBeNull();
  });
});

describe("periodLeftover", () => {
  const sept = { start: "2026-09-01", nextStart: "2026-10-01" };
  const rent: Bill = { name: "Rent", cents: 65000, dueDay: 5 };
  it("takes off spending and the bills that fell due in the period", () => {
    const txns = [tx("2026-09-03", 30000), tx("2026-09-20", 26200), tx("2026-10-01", 9999), tx("2026-08-31", 9999)];
    expect(periodLeftover(140000, txns, [rent], sept)).toBe(140000 - 56200 - 65000);
  });
  it("is never negative", () => expect(periodLeftover(10000, [tx("2026-09-03", 12000)], [], sept)).toBe(0));
  it("skips rent that fell due before the bill was added", () => {
    expect(periodLeftover(140000, [], [{ ...rent, addedOn: "2026-09-06" }], sept)).toBe(140000);
    expect(periodLeftover(140000, [], [{ ...rent, addedOn: "2026-09-05" }], sept)).toBe(140000 - 65000);
  });
});

describe("wrapped", () => {
  const sept = monthRange("2026-09");
  const txns = [
    tx("2026-09-01", 1200, "7-Eleven", "Groceries"),
    tx("2026-09-02", 800, "7-eleven ", "Groceries"),
    tx("2026-09-02", 4500, "Concert", "Treat"),
    tx("2026-09-10", 650, "Tealive", "Treat"),
    tx("2026-09-12", 2500, "Grab", "Transport"),
    tx("2026-10-01", 99999, "Next month"),
  ];
  const base = { txns, bills: [] as Bill[], limit: 30000, period: month, month: sept, today: "2026-10-16" };

  it("adds up the month and the share of the budget", () => {
    const w = wrapped(base);
    expect(w).toMatchObject({ spent: 9650, budget: 30000, saved: 20350, treats: 2, days: 30 });
    expect(w.used).toBeCloseTo(0.3217, 3);
  });
  it("sorts categories by spend with shares that add to 1", () => {
    const w = wrapped(base);
    expect(w.categories.map((c) => c.category)).toEqual(["Treat", "Transport", "Groceries"]);
    expect(w.categories.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
  });
  it("groups the top place by label, ignoring case and spaces", () => {
    expect(wrapped(base).topPlace).toEqual({ label: "7-Eleven", visits: 2 });
    expect(wrapped({ ...base, txns: [tx("2026-09-01", 100, "A"), tx("2026-09-02", 100, "B")] }).topPlace).toBeNull();
  });
  it("counts rent as spent and scales a weekly budget to the month", () => {
    const w = wrapped({ ...base, bills: [{ name: "Rent", cents: 10000, dueDay: 5 }], limit: 7000, period: { kind: "week", startWeekday: 1 } });
    expect(w).toMatchObject({ budget: 30000, bills: 10000, saved: 30000 - 9650 - 10000 });
  });
  it("counts no rent from before the bill was added, like Home", () => {
    const w = wrapped({ ...base, txns: [], bills: [{ name: "Rent", cents: 60000, dueDay: 1, addedOn: "2026-10-17" }], limit: 100000, month: monthRange("2026-10"), today: "2026-10-17" });
    expect(w).toMatchObject({ bills: 0, used: 0 });
  });
  it("finds the best streak of days within the daily budget", () => {
    // 300.00 over 30 days = 10.00 a day. Over on the 1st, 2nd and 12th, so Sep 3–11 (9) and Sep 13–30 (18).
    expect(wrapped(base).streak).toBe(18);
  });
  it("counts a running month only up to today", () => {
    const oct = monthRange("2026-10");
    const w = wrapped({ ...base, txns: [], month: oct, today: "2026-10-05" });
    expect(w).toMatchObject({ streak: 5, days: 5, spent: 0, categories: [], topPlace: null, used: 0 });
  });
});

describe("favourites", () => {
  const t = (label: string, cents: number, date: string) => ({ label, cents, date, category: "Food" as const, source: "text" as const });
  it("keeps repeats only, most often first, with the latest price", () => {
    const txns = [t("Kopi", 450, "2026-10-01"), t("kopi ", 500, "2026-10-03"), t("Kopi", 450, "2026-10-02"), t("Grab", 1200, "2026-10-02"), t("Grab", 1100, "2026-10-04"), t("Cinema", 1800, "2026-10-05")];
    expect(favourites(txns)).toEqual([
      { label: "Kopi", cents: 500, category: "Food" },
      { label: "Grab", cents: 1100, category: "Food" },
    ]);
  });
});
