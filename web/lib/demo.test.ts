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

  it("matches whole words only", () => {
    expect(parseSpending("business lunch 20, farewell dinner 30, buses 3").map((i) => i.category)).toEqual([
      "Food",
      "Food",
      "Transport",
    ]);
  });

  it("handles thousands, bad decimals, negatives and counts", () => {
    expect(parseSpending("1,200 rent")).toEqual([{ label: "Rent", amount: 1200, category: "Other" }]);
    expect(parseSpending("coffee 12.5.3, lunch 12.555, -5 lunch")).toEqual([]);
    expect(parseSpending("2 coffees 9")).toEqual([{ label: "2 coffees", amount: 9, category: "Treat" }]);
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

it("rounds float sums before formatting", async () => {
  const { money } = await import("./demo");
  expect(money(11.999999999999998)).toBe("$12");
  expect(money(4.5)).toBe("$4.50");
});

describe("splitBill", async () => {
  const { splitBill } = await import("./demo");
  const bill = [
    { label: "Nasi lemak", cents: 1200, owner: "You" as const },
    { label: "Mee goreng", cents: 1000, owner: "Jordan" as const },
    { label: "Teh tarik x3", cents: 900, owner: "Shared" as const },
    { label: "Kuih", cents: 250, owner: "Shared" as const },
  ];
  it("splits evenly to the cent", () => {
    const s = splitBill(bill, "even");
    expect(s.You + s.Jordan + s.Sarah).toBe(3350);
    expect(s).toEqual({ You: 1118, Jordan: 1116, Sarah: 1116 });
  });
  it("splits by item with shared lines three ways", () => {
    expect(splitBill(bill, "items")).toEqual({ You: 1200 + 384, Jordan: 1000 + 383, Sarah: 383 });
  });
});
