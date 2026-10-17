import { describe, expect, it } from "vitest";
import { afford, hoursOfWork, money, parseSpending, splitBill } from "./index";

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

it("rounds float sums before formatting", () => {
  expect(money(11.999999999999998, "USD", "en-US")).toBe("$12");
  expect(money(4.5, "USD", "en-US")).toBe("$4.50");
  expect(money(1200, "USD", "en-US")).toBe("$1,200");
});

it("uses the currency's own minor digits", () => {
  expect(money(33.33, "KRW", "en-US")).toBe("₩33");
  expect(money(4.5, "JPY", "en-US")).toBe("¥5");
  expect(money(4.5, "MYR", "en-US")).toMatch(/4\.50$/); // separator is an NBSP
});

describe("splitBill", () => {
  const people = ["Ana", "Ben", "Cy"] as const;
  const bill = [
    { label: "Nasi lemak", cents: 1200, owner: "Ana" as const },
    { label: "Mee goreng", cents: 1000, owner: "Ben" as const },
    { label: "Teh tarik x3", cents: 900, owner: "Shared" as const },
    { label: "Kuih", cents: 250, owner: "Shared" as const },
  ];
  it("splits evenly to the cent, leftover to the payer", () => {
    expect(splitBill(bill, "even", people, "Ben")).toEqual({ Ana: 1116, Ben: 1118, Cy: 1116 });
  });
  it("splits by item with shared lines between everyone", () => {
    expect(splitBill(bill, "items", people, "Ana")).toEqual({ Ana: 1200 + 384, Ben: 1000 + 383, Cy: 383 });
  });
  it("works for two people", () => {
    expect(splitBill([{ label: "Pizza", cents: 1001, owner: "Shared" }], "items", ["A", "B"], "A")).toEqual({ A: 501, B: 500 });
  });
});

describe("parseSpending per currency", () => {
  it("keeps the ringgit-scale cap by default", () => {
    expect(parseSpending("laptop 150000")).toEqual([]);
  });
  it("takes everyday dong and rupiah amounts", () => {
    expect(parseSpending("pho 150000", "VND")).toEqual([{ label: "Pho", amount: 150000, category: "Food" }]);
    expect(parseSpending("nasi goreng 150.000", "IDR")).toEqual([{ label: "Nasi goreng", amount: 150000, category: "Food" }]);
  });
  it("still reads a dot as decimals where there are cents", () => {
    expect(parseSpending("kopi 4.500", "MYR")).toEqual([]);
    expect(parseSpending("kopi 4.50", "MYR")).toEqual([{ label: "Kopi", amount: 4.5, category: "Treat" }]);
  });
});
