import { describe, expect, it } from "vitest";
import { afford, hoursOfWork, parseSpending } from "./demo";

describe("parseSpending", () => {
  it("splits a quick-add line into categorised items", () => {
    expect(parseSpending("lunch 12, grab 8 and $4.50 kopi")).toEqual([
      { label: "Lunch", amount: 12, category: "Food" },
      { label: "Grab", amount: 8, category: "Transport" },
      { label: "Kopi", amount: 4.5, category: "Treat" },
    ]);
  });

  it("handles number-first, currency words and junk", () => {
    expect(parseSpending("15 netflix; rm 6 bubble tea, hello, 0 nothing")).toEqual([
      { label: "Netflix", amount: 15, category: "Subscription" },
      { label: "Bubble tea", amount: 6, category: "Treat" },
    ]);
  });

  it("falls back to Other and a default label", () => {
    expect(parseSpending("7")).toEqual([{ label: "Something", amount: 7, category: "Other" }]);
  });
});

describe("afford", () => {
  const week = { left: 54, daysLeft: 4, weeklyBudget: 100 };
  it("says yes when plenty is left", () => expect(afford(20, week).verdict).toBe("yes"));
  it("says tight when the daily amount collapses", () => expect(afford(50, week).verdict).toBe("tight"));
  it("says no when it doesn't fit", () => expect(afford(60, week)).toEqual({ verdict: "no", perDayAfter: 0 }));
});

it("rounds hours of work to half hours", () => {
  expect(hoursOfWork(60, 12)).toBe(5);
  expect(hoursOfWork(40, 12)).toBe(3.5);
});
