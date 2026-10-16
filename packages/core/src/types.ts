// Shared data shapes (spec section 7). Money is always integer cents; dates are "YYYY-MM-DD".
import type { IsoDate } from "./dates";
import type { Category } from "./index";

export type Transaction = {
  date: IsoDate;
  cents: number;
  label: string;
  category: Category;
  source?: "manual" | "text" | "photo" | "csv";
  splitId?: string;
};

// The overall budget's period. "until" runs from `start` up to (not including) payday.
export type BudgetPeriod =
  | { kind: "week"; startWeekday: number } // 0 = Sunday … 6 = Saturday
  | { kind: "month"; startDay: number } // 1–31, clamped in short months
  | { kind: "until"; start: IsoDate; payday: IsoDate };

// A monthly fixed bill such as rent. Occurrences on or before `paidThrough` no longer count as upcoming.
export type Bill = { name: string; cents: number; dueDay: number; paidThrough?: IsoDate };

export type Interval = "week" | "month" | "year";

export type Subscription = {
  merchant: string;
  cents: number;
  interval: Interval;
  nextDate: IsoDate;
  confirmed: boolean;
};

export type Treat = { name: string; lastCents: number; lastDate?: IsoDate; minDaysBetween: number };

export type Iou = {
  friend: string;
  cents: number;
  direction: "theyOweMe" | "iOweThem";
  note: string;
  date: IsoDate;
  paid: boolean;
};
