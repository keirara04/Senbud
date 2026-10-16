import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, nextDueDate, prevDueDate, weekday } from "./dates";

describe("day arithmetic", () => {
  it("crosses month, year and leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-16", "2026-11-01")).toBe(16);
    expect(daysBetween("2026-11-01", "2026-10-16")).toBe(-16);
  });
  it("knows the weekday", () => {
    expect(weekday("2026-10-16")).toBe(5); // Friday
    expect(weekday("2026-10-18")).toBe(0); // Sunday
  });
  it("clamps month addition", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
  });
});

describe("nextDueDate", () => {
  it("is today when due today, else later this month, else next month", () => {
    expect(nextDueDate(16, "2026-10-16")).toBe("2026-10-16");
    expect(nextDueDate(25, "2026-10-16")).toBe("2026-10-25");
    expect(nextDueDate(1, "2026-10-16")).toBe("2026-11-01");
    expect(nextDueDate(5, "2026-12-20")).toBe("2027-01-05");
  });
  it("clamps the 31st to short months", () => {
    expect(nextDueDate(31, "2027-02-01")).toBe("2027-02-28");
    expect(nextDueDate(31, "2028-02-01")).toBe("2028-02-29");
    expect(nextDueDate(31, "2026-04-10")).toBe("2026-04-30");
    expect(nextDueDate(31, "2027-01-31")).toBe("2027-01-31");
    expect(nextDueDate(30, "2027-02-28")).toBe("2027-02-28");
    expect(nextDueDate(29, "2027-03-01")).toBe("2027-03-29");
  });
});

describe("prevDueDate", () => {
  it("finds the latest occurrence on or before a date", () => {
    expect(prevDueDate(1, "2026-10-16")).toBe("2026-10-01");
    expect(prevDueDate(16, "2026-10-16")).toBe("2026-10-16");
    expect(prevDueDate(25, "2026-01-16")).toBe("2025-12-25");
    expect(prevDueDate(31, "2027-03-15")).toBe("2027-02-28");
  });
});
