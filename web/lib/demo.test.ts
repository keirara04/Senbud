import { describe, expect, it } from "vitest";
import { money, splitBill, untilPayday } from "./demo";

it("formats demo prices in USD", () => {
  expect(money(11.999999999999998)).toBe("$12");
  expect(money(4.5)).toBe("$4.50");
});

it("splits the demo bill with leftover cents to You", () => {
  const s = splitBill([{ label: "Sodas x3", cents: 1150, owner: "Shared" }], "even");
  expect(s).toEqual({ You: 384, Jordan: 383, Sarah: 383 });
});

describe("untilPayday", () => {
  it("spreads what's left after bills and savings until payday", () => {
    expect(untilPayday({ balance: 640, bills: 250, keep: 50, days: 14 })).toEqual({ days: 14, perDay: 24.28, perWeek: 170, short: 0 });
  });

  it("gives the total, not a weekly rate, when payday is under a week away", () => {
    expect(untilPayday({ balance: 100, bills: 0, keep: 0, days: 3 })).toMatchObject({ perDay: 33.33, perWeek: 100 });
  });

  it("reports the shortfall instead of a negative budget", () => {
    expect(untilPayday({ balance: 200, bills: 250, keep: 20, days: 10 })).toEqual({ days: 10, perDay: 0, perWeek: 0, short: 70 });
  });

  it("treats payday today or a fraction of a day as one day", () => {
    expect(untilPayday({ balance: 50, bills: 0, keep: 0, days: 0 }).days).toBe(1);
    expect(untilPayday({ balance: 50, bills: 0, keep: 0, days: 2.2 }).days).toBe(3);
  });
});
