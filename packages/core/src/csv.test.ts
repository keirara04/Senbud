import { describe, expect, it } from "vitest";
import { fromCsv, parseAmount, parseCsv, parseDate, toCsv } from "./index";

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF, semicolons and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
    expect(parseCsv("a;b\n1,5;2\n")).toEqual([["a", "b"], ["1,5", "2"]]);
  });
});

describe("parseAmount and parseDate", () => {
  it("reads money the way banks write it", () => {
    expect([parseAmount("RM 1,234.50"), parseAmount("-12.00"), parseAmount("(8.40)"), parseAmount("12,50"), parseAmount("1.234,56")]).toEqual([1234.5, -12, -8.4, 12.5, 1234.56]);
    expect(parseAmount("abc")).toBeNaN();
  });
  it("reads ISO, day-first and month-first dates, and rejects impossible ones", () => {
    expect(parseDate("2026-10-03", true)).toBe("2026-10-03");
    expect(parseDate("03/10/2026", true)).toBe("2026-10-03");
    expect(parseDate("10/03/2026", false)).toBe("2026-10-03");
    expect(parseDate("3.10.26", true)).toBe("2026-10-03");
    expect(parseDate("31/02/2026", true)).toBeNull();
  });
});

describe("fromCsv", () => {
  it("round-trips Senbud's own export", () => {
    const txns = [{ date: "2026-10-03", cents: 450, label: "Kopi, kaya toast", category: "Treat" as const }];
    expect(fromCsv(toCsv(txns, "MYR"), { dayFirst: true }).rows).toEqual([{ ...txns[0], source: "csv" }]);
  });
  it("takes only money out from a signed bank file, settles the date order from the data, and categorizes", () => {
    const bank = "Transaction Date,Description,Amount\n13/10/2026,GRAB*RIDE,-15.00\n14/10/2026,SALARY,1200.00\n02/10/2026,Netflix,-17.00\n";
    const r = fromCsv(bank, { dayFirst: false });
    expect(r.rows.map((x) => [x.date, x.cents, x.category])).toEqual([
      ["2026-10-13", 1500, "Transport"],
      ["2026-10-02", 1700, "Subscription"],
    ]);
    expect(r.skipped).toBe(1); // the salary
  });
  it("knows statement-style merchant names", async () => {
    const { categorize } = await import("./index");
    expect(["GRAB*FOOD 1234", "Tealive Brown Sugar", "Kopitiam, Bangsar", "KFC MID VALLEY", "GRAB*RIDE KL"].map(categorize)).toEqual(["Food", "Treat", "Food", "Food", "Transport"]);
  });
  it("reads debit and credit columns", () => {
    const r = fromCsv("Date,Details,Debit,Credit\n2026-10-05,Tealive,8.90,\n2026-10-06,Refund,,20.00\n", { dayFirst: true });
    expect(r.rows.map((x) => x.cents)).toEqual([890]);
  });
  it("skips what's already there, so the same file twice adds nothing", () => {
    const csv = "date,amount,label\n2026-10-03,4.50,Kopi\n";
    const existing = fromCsv(csv, { dayFirst: true }).rows;
    expect(fromCsv(csv, { dayFirst: true, existing })).toMatchObject({ rows: [], duplicates: 1 });
  });
  it("says so when it can't find the columns", () => {
    expect(fromCsv("foo,bar\n1,2\n", { dayFirst: true }).error).toBe("no-columns");
  });
});
