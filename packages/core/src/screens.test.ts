import { describe, expect, it } from "vitest";
import { jarFill, pickNudge, stamps } from "./index";
import type { Iou, Subscription, Treat } from "./types";

describe("stamps", () => {
  it("fills one stamp per 10% of the limit, rounded", () => {
    expect(stamps(24800, 40000)).toEqual({ filled: 6, over: false, left: 15200, status: "ok" });
    expect(stamps(500, 40000)?.filled).toBe(0);
  });
  it("is close from 90% and over past the limit, with all ten filled", () => {
    expect(stamps(37600, 40000)).toMatchObject({ filled: 9, over: false, status: "close" });
    expect(stamps(41200, 40000)).toEqual({ filled: 10, over: true, left: -1200, status: "over" });
  });
  it("has nothing to stamp without a limit", () => {
    expect(stamps(1000, undefined)).toBeNull();
    expect(stamps(1000, 0)).toBeNull();
  });
});

describe("jarFill", () => {
  it("fills toward the goal", () => {
    expect(jarFill(4650, 6000)).toEqual({ share: 0.775, percent: 77, reached: false, toGo: 1350 });
  });
  it("reaches the goal and can overflow", () => {
    expect(jarFill(6190, 6000)).toMatchObject({ percent: 100, reached: true, toGo: 0 });
    expect(jarFill(6190, 6000)!.share).toBeGreaterThan(1);
  });
  it("has no fill without a goal", () => expect(jarFill(500, undefined)).toBeNull());
});

describe("pickNudge", () => {
  const today = "2026-10-16";
  const netflix: Subscription = { merchant: "Netflix", cents: 1700, interval: "month", nextDate: "2026-10-17", confirmed: true };
  const iou: Iou = { friend: "Sarah", cents: 1400, direction: "theyOweMe", note: "Dinner", date: "2026-10-01", paid: false };
  const tealive: Treat = { name: "Tealive", lastCents: 900, lastDate: "2026-10-01", minDaysBetween: 7 };
  const base = { today, subscriptions: [], ious: [], treats: [], safe: { perDay: 2500, covered: true }, onTrack: true };

  it("prefers a renewal tomorrow, then an old IOU, then a treat", () => {
    expect(pickNudge({ ...base, subscriptions: [netflix], ious: [iou], treats: [tealive] })?.kind).toBe("renewal");
    expect(pickNudge({ ...base, ious: [iou], treats: [tealive] })?.kind).toBe("iou");
    expect(pickNudge({ ...base, treats: [tealive] })?.kind).toBe("treat");
  });
  it("skips unconfirmed subscriptions and IOUs you owe", () => {
    expect(pickNudge({ ...base, subscriptions: [{ ...netflix, confirmed: false }], ious: [{ ...iou, direction: "iOweThem" }] })).toBeNull();
  });
  it("never nudges a treat when spending isn't on track", () => {
    expect(pickNudge({ ...base, treats: [tealive], onTrack: false })).toBeNull();
  });
});

describe("nudges", () => {
  const today = "2026-10-16";
  const range = { start: "2026-10-01", nextStart: "2026-11-01" };
  const base = { today, subscriptions: [], ious: [], treats: [], safe: { perDay: 2500, covered: true }, onTrack: true, range };
  const rent = { name: "Rent", cents: 45000, dueDay: 18 };
  const netflix: Subscription = { merchant: "Netflix", cents: 1700, interval: "month", nextDate: "2026-10-17", confirmed: true };
  const food = (cents: number) => ({ date: "2026-10-10", cents, label: "Lunch", category: "Food" as const });

  it("puts a bill due within 3 days first, then a category running out", async () => {
    const { nudges } = await import("./index");
    const out = nudges({ ...base, bills: [rent], limits: { Food: 30000 }, txns: [food(29000)], subscriptions: [netflix] });
    expect(out.map((n) => n.kind)).toEqual(["bill", "category", "renewal"]);
    expect(out[0]).toMatchObject({ days: 2, covered: true });
    expect(out[1]).toMatchObject({ category: "Food", status: "close" });
  });
  it("skips bills further out and categories on pace", async () => {
    const { nudges } = await import("./index");
    // Day 16 of 31 with 40% used is on pace.
    expect(nudges({ ...base, bills: [{ ...rent, dueDay: 25 }], limits: { Food: 30000 }, txns: [food(12000)] })).toEqual([]);
  });
  it("checks a category on its own period when it has one", async () => {
    const { nudges } = await import("./index");
    // Food weekly (from Monday 12 Oct): the 10 Oct lunch is last week, so 50 of 100 by Friday is on pace.
    const weekly = { Food: { kind: "week" as const, startWeekday: 1 } };
    const txns = [food(20000), { ...food(5000), date: "2026-10-12" }];
    expect(nudges({ ...base, limits: { Food: 10000 }, limitPeriods: weekly, txns })).toEqual([]);
    // On the month, the same spending is over.
    expect(nudges({ ...base, limits: { Food: 10000 }, txns })[0]).toMatchObject({ kind: "category", status: "over" });
  });
  it("adds a spotted subscription and a streak of 3 or more, and no treat once anything is said", async () => {
    const { nudges } = await import("./index");
    const tealive: Treat = { name: "Tealive", lastCents: 900, lastDate: "2026-10-01", minDaysBetween: 7 };
    expect(nudges({ ...base, spotted: [{ ...netflix, confirmed: false }], streak: 4, treats: [tealive] }).map((n) => n.kind)).toEqual(["spotted", "streak"]);
    expect(nudges({ ...base, streak: 2, treats: [tealive] }).map((n) => n.kind)).toEqual(["treat"]);
  });
  it("notes a renewal tomorrow even when the stored next date has passed", async () => {
    const { nudges } = await import("./index");
    const old = { ...netflix, nextDate: "2026-09-17" };
    expect(nudges({ ...base, subscriptions: [old] }).map((n) => n.kind)).toEqual(["renewal"]);
    expect(nudges({ ...base, today: "2026-11-16", subscriptions: [old] }).map((n) => n.kind)).toEqual(["renewal"]);
    expect(nudges({ ...base, today: "2026-11-09", subscriptions: [old] }).map((n) => n.kind)).not.toContain("renewal");
  });
  it("keys notes by what they're about", async () => {
    const { nudgeKey } = await import("./index");
    expect(nudgeKey({ kind: "category", category: "Food", spent: 1, limit: 2, status: "ok" })).toBe("category:Food");
    expect(nudgeKey({ kind: "streak", days: 3 })).toBe("streak");
  });
});

describe("underBudgetStreak", () => {
  const period = { kind: "month" as const, startDay: 1 };
  const day = (date: string, cents: number) => ({ date, cents, label: "x", category: "Food" as const });
  it("counts full days before today within the daily share, back to the period start", async () => {
    const { underBudgetStreak } = await import("./index");
    // 31,000 over 31 days is 1,000 a day.
    const txns = [day("2026-10-12", 1500), day("2026-10-13", 900), day("2026-10-15", 1000), day("2026-10-16", 5000)];
    expect(underBudgetStreak(txns, 31000, period, "2026-10-16")).toBe(3);
  });
  it("is zero on the first day and stops at the period start", async () => {
    const { underBudgetStreak } = await import("./index");
    expect(underBudgetStreak([], 31000, period, "2026-10-01")).toBe(0);
    expect(underBudgetStreak([day("2026-10-01", 500)], 31000, period, "2026-10-03")).toBe(2);
  });
  it("doesn't count days before anything was logged this period", async () => {
    const { underBudgetStreak } = await import("./index");
    expect(underBudgetStreak([day("2026-10-17", 900)], 31000, period, "2026-10-17")).toBe(0);
    expect(underBudgetStreak([day("2026-10-14", 900)], 31000, period, "2026-10-17")).toBe(3);
    expect(underBudgetStreak([day("2026-09-30", 0)], 31000, period, "2026-10-03")).toBe(0);
  });
  it("takes bills owed this period off the daily share, like Wrapped", async () => {
    const { underBudgetStreak, wrapped, monthRange } = await import("./index");
    const txns = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d) => day(d, 4000));
    const rent = [{ name: "Rent", cents: 65000, dueDay: 5 }];
    expect(underBudgetStreak(txns, 155000, period, "2026-10-04")).toBe(3);
    expect(underBudgetStreak(txns, 155000, period, "2026-10-04", rent)).toBe(0);
    expect(wrapped({ txns, bills: rent, limit: 155000, period, month: monthRange("2026-10"), today: "2026-10-03" }).streak).toBe(0);
  });
});

describe("compareToLast", () => {
  it("compares this period so far with the last one at the same day", async () => {
    const { compareToLast } = await import("./index");
    const t = (date: string, cents: number) => ({ date, cents, label: "x", category: "Food" as const });
    const txns = [t("2026-09-03", 1000), t("2026-09-20", 4000), t("2026-10-02", 2500), t("2026-10-05", 500)];
    expect(compareToLast(txns, { kind: "month", startDay: 1 }, "2026-10-05")).toEqual({ now: 3000, thenByNow: 1000, thenTotal: 5000, day: 5, lastStart: "2026-09-01" });
    // Audit bug: an until budget compared the period with itself. Now the 10 days before it.
    expect(compareToLast(txns, { kind: "until", start: "2026-10-01", payday: "2026-10-11" }, "2026-10-05").lastStart).toBe("2026-09-21");
  });
});

describe("splitByItems", () => {
  it("gives each person their items and splits shared ones evenly, leftover cents to the payer", async () => {
    const { splitByItems } = await import("./index");
    const items = [
      { cents: 1200, owners: ["You"] as const },
      { cents: 930, owners: ["Aiman"] as const },
      { cents: 1000, owners: ["You", "Aiman", "Sarah"] as const },
    ];
    const shares = splitByItems(items.map((i) => ({ cents: i.cents, owners: [...i.owners] })), ["You", "Aiman", "Sarah"], "You");
    expect(shares).toEqual({ You: 1200 + 334, Aiman: 930 + 333, Sarah: 333 });
    expect(shares.You + shares.Aiman + shares.Sarah).toBe(3130);
  });
  it("skips items nobody claimed", async () => {
    const { splitByItems } = await import("./index");
    expect(splitByItems([{ cents: 500, owners: [] }], ["You", "Sarah"], "You")).toEqual({ You: 0, Sarah: 0 });
  });
});

describe("toCsv", () => {
  it("writes major units and quotes labels with commas or quotes", async () => {
    const { toCsv } = await import("./index");
    const csv = toCsv([{ date: "2026-10-16", cents: 450, label: 'Kopi, "large"', category: "Food" }], "MYR");
    expect(csv.split("\n")).toEqual(["date,amount,currency,label,category,source", '2026-10-16,4.5,MYR,"Kopi, ""large""",Food,manual']);
  });
});

describe("readIntent", () => {
  it("routes lines by rules", async () => {
    const { readIntent } = await import("./index");
    expect(readIntent("can I afford a RM 45 ticket on saturday?")).toEqual({ kind: "afford", amount: 45, label: "Ticket on saturday" });
    expect(readIntent("can I afford it")).toEqual({ kind: "afford", label: "" });
    expect(readIntent("badminton court 32 split with aiman and sarah")).toEqual({ kind: "split", amount: 32, label: "Badminton court", people: ["Aiman", "Sarah"] });
    expect(readIntent("how's my month?")).toEqual({ kind: "month" });
    expect(readIntent("How’s my month?")).toEqual({ kind: "month" });
    expect(readIntent("kopi 4.50, grab 12").kind).toBe("add");
    expect(readIntent("how much did I spend on grab this month?")).toEqual({ kind: "spentOn", query: "grab" });
    expect(readIntent("hello")).toEqual({ kind: "ask" });
    expect(readIntent("who won the world cup in 2022")).toEqual({ kind: "ask" });
    expect(readIntent("write me an essay about 1984")).toEqual({ kind: "ask" });
    expect(readIntent("which bills are due")).toEqual({ kind: "ask" });
    expect(readIntent("whopper 15").kind).toBe("add");
  });
  it("answers more questions from the phone's own numbers", async () => {
    const { readIntent } = await import("./index");
    expect(readIntent("how much on food")).toEqual({ kind: "spentOn", query: "food" });
    expect(readIntent("How much have I spent on my treats so far?")).toEqual({ kind: "spentOn", query: "treats" });
    expect(readIntent("spent on bubble tea this week")).toEqual({ kind: "spentOn", query: "bubble tea" });
    expect(readIntent("what's my biggest spend?")).toEqual({ kind: "biggest" });
    expect(readIntent("when's rent due?")).toEqual({ kind: "bills" });
    expect(readIntent("next bill")).toEqual({ kind: "bills" });
    expect(readIntent("how many days left?")).toEqual({ kind: "daysLeft" });
    expect(readIntent("how much is left?")).toEqual({ kind: "month" });
    expect(readIntent("where did my money go?")).toEqual({ kind: "month" });
    expect(readIntent("how does this compare to last month?")).toEqual({ kind: "compare" });
    expect(readIntent("and last week?")).toEqual({ kind: "compare" });
  });
  it("keeps quick adds that only look like those questions", async () => {
    const { readIntent } = await import("./index");
    expect(readIntent("lunch with sarah last week 20").kind).toBe("add");
    expect(readIntent("business lunch 25").kind).toBe("add");
    expect(readIntent("spent on lunch 12").kind).toBe("add");
  });
});

describe("withCharges", () => {
  it("adds the gap between the printed total and the items as one line", async () => {
    const { withCharges } = await import("./index");
    const items = [
      { label: "2 x Nasi Kandar Ayam", amount: 27.8, category: "Food" as const },
      { label: "1 x Roti Canai Telur", amount: 3.5, category: "Food" as const },
      { label: "3 x Teh Tarik Ais", amount: 10.5, category: "Treat" as const },
      { label: "1 x Maggi Goreng", amount: 8.9, category: "Food" as const },
    ];
    const out = withCharges(items, 59.1);
    expect(out).toHaveLength(5);
    expect(out[4]).toEqual({ label: "Service charge and tax", amount: 8.4, category: "Food" });
    expect(withCharges(items, 50.7)).toBe(items); // already adds up
    expect(withCharges(items, 45)).toBe(items); // discount: leave it
    expect(withCharges(items, null)).toBe(items);
  });
});
