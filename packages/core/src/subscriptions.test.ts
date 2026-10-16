import { describe, expect, it } from "vitest";
import { detectSubscriptions, monthlySubscriptionCost, subscriptionsDue } from "./subscriptions";
import type { Subscription, Transaction } from "./types";

const charges = (label: string, cents: number, dates: string[]): Transaction[] =>
  dates.map((date) => ({ date, cents, label, category: "Subscription" }));

describe("detectSubscriptions", () => {
  it("finds monthly, weekly and yearly charges, in any order", () => {
    const txns = [
      ...charges("Spotify", 1_199, ["2026-10-15", "2026-08-15", "2026-09-15"]),
      ...charges("Gym", 1_500, ["2026-10-01", "2026-10-08", "2026-10-15"]),
      ...charges("Domain", 1_200, ["2025-03-10", "2026-03-10"]),
    ];
    expect(detectSubscriptions(txns)).toEqual([
      { merchant: "Spotify", cents: 1_199, interval: "month", nextDate: "2026-11-15", confirmed: false },
      { merchant: "Gym", cents: 1_500, interval: "week", nextDate: "2026-10-22", confirmed: false },
      { merchant: "Domain", cents: 1_200, interval: "year", nextDate: "2027-03-10", confirmed: false },
    ]);
  });
  it("keeps a month-end billing day through short months", () => {
    const [netflix] = detectSubscriptions(charges("Netflix", 1_549, ["2027-01-31", "2027-02-28", "2027-03-31"]));
    expect(netflix.nextDate).toBe("2027-04-30");
    expect(detectSubscriptions(charges("Netflix", 1_549, ["2027-01-31", "2027-02-28"]))[0].nextDate).toBe("2027-03-31");
  });
  it("matches merchants loosely and amounts within 10%", () => {
    const txns = [...charges("spotify ", 1_000, ["2026-09-15"]), ...charges("Spotify", 1_090, ["2026-10-15"])];
    expect(detectSubscriptions(txns)).toMatchObject([{ merchant: "Spotify", cents: 1_090 }]);
    const pricey = [...charges("Spotify", 1_000, ["2026-09-15"]), ...charges("Spotify", 1_200, ["2026-10-15"])];
    expect(detectSubscriptions(pricey)).toEqual([]);
  });
  it("ignores one-offs, irregular gaps and same-day repeats", () => {
    expect(detectSubscriptions(charges("Kopi", 400, ["2026-10-01"]))).toEqual([]);
    expect(detectSubscriptions(charges("Kopi", 400, ["2026-10-01", "2026-10-03", "2026-10-10"]))).toEqual([]);
    expect(detectSubscriptions(charges("Kopi", 400, ["2026-10-01", "2026-10-01"]))).toEqual([]);
    expect(detectSubscriptions(charges("Kopi", 400, ["2026-08-01", "2026-09-15"]))).toEqual([]);
  });
});

describe("subscriptionsDue", () => {
  const sub: Subscription = { merchant: "Netflix", cents: 1_549, interval: "month", nextDate: "2027-01-31", confirmed: true };
  it("counts every renewal before the cutoff without month-end drift", () => {
    expect(subscriptionsDue([sub], "2027-01-01", "2027-04-01")).toBe(3 * 1_549); // Jan 31, Feb 28, Mar 31
    expect(subscriptionsDue([sub], "2027-01-01", "2027-03-31")).toBe(2 * 1_549);
  });
  it("skips renewals before today and unconfirmed subscriptions", () => {
    const gym: Subscription = { merchant: "Gym", cents: 1_500, interval: "week", nextDate: "2026-10-01", confirmed: true };
    expect(subscriptionsDue([gym], "2026-10-16", "2026-10-25")).toBe(1_500); // only Oct 22
    expect(subscriptionsDue([{ ...sub, confirmed: false }], "2027-01-01", "2027-04-01")).toBe(0);
  });
});

it("totals confirmed subscriptions per month", () => {
  const subs: Subscription[] = [
    { merchant: "Spotify", cents: 1_199, interval: "month", nextDate: "2026-11-15", confirmed: true },
    { merchant: "Domain", cents: 12_000, interval: "year", nextDate: "2027-03-10", confirmed: true },
    { merchant: "Gym", cents: 500, interval: "week", nextDate: "2026-10-22", confirmed: true },
    { merchant: "Maybe", cents: 9_999, interval: "month", nextDate: "2026-10-22", confirmed: false },
  ];
  expect(monthlySubscriptionCost(subs)).toBe(1_199 + 1_000 + 2_167);
});
