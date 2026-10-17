import { describe, expect, it } from "vitest";
import { reminderSchedule } from "./reminders";
import type { Bill, BudgetPeriod, Subscription } from "./types";

const fmt = (c: number) => `$${c / 100}`;
const month: BudgetPeriod = { kind: "month", startDay: 1 };
const rent: Bill = { name: "Rent", cents: 65_000, dueDay: 31 };
const netflix: Subscription = { merchant: "Netflix", cents: 1_549, interval: "month", nextDate: "2026-09-20", confirmed: true };
const run = (o: Partial<Parameters<typeof reminderSchedule>[0]>) =>
  reminderSchedule({ kinds: ["bills", "renewals", "reset"], bills: [], subscriptions: [], period: month, today: "2026-10-17", fmt, ...o });

describe("reminderSchedule", () => {
  it("warns the evening before and the morning of each bill, clamped to short months", () => {
    const r = run({ kinds: ["bills"], bills: [rent] });
    expect(r.map((x) => [x.date, x.hour, x.title])).toEqual([
      ["2026-10-30", 19, "Rent $650 is due tomorrow"],
      ["2026-10-31", 9, "Rent $650 is due today"],
      ["2026-11-29", 19, "Rent $650 is due tomorrow"],
      ["2026-11-30", 9, "Rent $650 is due today"],
    ]);
  });

  it("skips a bill already paid this month", () => {
    const r = run({ kinds: ["bills"], bills: [{ ...rent, paidThrough: "2026-10-31" }] });
    expect(r.map((x) => x.date)).toEqual(["2026-11-29", "2026-11-30"]);
  });

  it("keeps today's morning notice when the bill is due today, drops yesterday's", () => {
    const r = run({ kinds: ["bills"], bills: [{ ...rent, dueDay: 17 }], horizonDays: 10 });
    expect(r.map((x) => x.key)).toEqual(["bill:Rent:2026-10-17:day"]);
  });

  it("reminds of confirmed renewals only, from the stored date onwards", () => {
    const r = run({ kinds: ["renewals"], subscriptions: [netflix, { ...netflix, merchant: "Gym", confirmed: false }] });
    expect(r.map((x) => [x.date, x.title])).toEqual([
      ["2026-10-19", "Netflix renews tomorrow, $15.49"],
      ["2026-11-19", "Netflix renews tomorrow, $15.49"],
    ]);
  });

  it("says the budget resets the evening before each new period", () => {
    expect(run({ kinds: ["reset"] }).map((x) => x.date)).toEqual(["2026-10-31", "2026-11-30"]);
    // 17 Oct 2026 is a Saturday; weeks start Monday.
    const weekly = run({ kinds: ["reset"], period: { kind: "week", startWeekday: 1 }, horizonDays: 14 });
    expect(weekly.map((x) => x.date)).toEqual(["2026-10-18", "2026-10-25"]);
  });

  it("schedules nothing for kinds that are off, and stays under the iOS limit", () => {
    expect(run({ kinds: [], bills: [rent], subscriptions: [netflix] })).toEqual([]);
    const many = Array.from({ length: 40 }, (_, i) => ({ ...rent, name: `Bill ${i}` }));
    expect(run({ kinds: ["bills"], bills: many }).length).toBe(48);
  });
});
