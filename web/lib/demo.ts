// Landing-page demo glue: the logic lives in @senbud/core, this file pins the demo's currency and cast.
import { type BillItem as CoreBillItem, money as coreMoney, splitBill as coreSplitBill } from "@senbud/core";

export { afford, type Category, categorize, hoursOfWork, type Item, parseSpending, type Verdict } from "@senbud/core";

export const money = (value: number) => coreMoney(value, "USD", "en-US");

export type Person = "You" | "Jordan" | "Sarah";
export const PEOPLE: Person[] = ["You", "Jordan", "Sarah"];
export type Owner = Person | "Shared";
export type BillItem = CoreBillItem<Person>;

// "You" paid, so leftover cents go to you.
export const splitBill = (items: BillItem[], mode: "even" | "items") => coreSplitBill(items, mode, PEOPLE, "You");

// Student budget calculator: what's left after bills and savings, spread evenly until money comes in.
// Rounded down to the cent so the advice never overspends. Under a week, "perWeek" is just the total.
// ponytail: swap for the shared safe-to-spend logic once it lands in packages/core.
export function untilPayday(opts: { balance: number; bills: number; keep: number; days: number }) {
  const days = Math.max(1, Math.ceil(opts.days));
  const spendable = opts.balance - opts.bills - opts.keep;
  const floor = (n: number) => Math.floor(Math.max(0, n) * 100) / 100;
  return {
    days,
    perDay: floor(spendable / days),
    perWeek: floor(days < 7 ? spendable : (spendable / days) * 7),
    short: floor(-spendable),
  };
}
