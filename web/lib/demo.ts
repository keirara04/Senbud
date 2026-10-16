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
