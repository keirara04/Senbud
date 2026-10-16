// Senbud's shared money logic, used by web and mobile. Pure functions: no AI, no network, no platform APIs.
export * from "./budget";
export * from "./dates";
export * from "./iou";
export * from "./subscriptions";
export type * from "./types";

export type Category = "Food" | "Transport" | "Treat" | "Groceries" | "Subscription" | "Other";

export type Item = { label: string; amount: number; category: Category };

// Whole words only (plus simple plurals), so "business lunch" isn't read as a bus fare.
const RULES: [RegExp, Category][] = (
  [
    ["bubble ?tea|boba|coffee|kopi|latte|starbucks|cake|ice ?cream|dessert|burger|big ?mac|fries|snack", "Treat"],
    ["netflix|spotify|youtube|icloud|disney|prime|gym|chatgpt|subscription", "Subscription"],
    ["grab|uber|lyft|taxi|bus|train|mrt|lrt|metro|petrol|gas|parking|fare", "Transport"],
    ["grocer(?:y|ies)?|market|tesco|walmart|aldi|lotus|mydin|trader joe|costco", "Groceries"],
    ["lunch|dinner|breakfast|brunch|food|nasi|mee|pizza|sushi|ramen|mamak|meal|chipotle", "Food"],
  ] as const
).map(([words, cat]) => [new RegExp(`\\b(?:${words})(?:e?s)?\\b`), cat]);

export function categorize(label: string): Category {
  const l = label.toLowerCase();
  return RULES.find(([re]) => re.test(l))?.[1] ?? "Other";
}

// A whole number or one with up to 2 decimals, not part of a longer number and not negative.
const AMOUNT = /(?<![\d.-])\d+(?:\.\d{1,2})?(?![\d.])/g;

// "lunch 12, grab 8 and $4.50 kopi" -> 3 items. Chunks without a valid amount are ignored.
export function parseSpending(text: string): Item[] {
  return text
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // "1,200" -> "1200" before splitting on commas
    .split(/,|;|\n|\band\b|\+/i)
    .map((chunk) => chunk.trim())
    .flatMap((chunk) => {
      const m = [...chunk.matchAll(AMOUNT)].at(-1); // "2 coffees 9" -> 9
      if (!m || m.index === undefined) return [];
      const amount = Number(m[0]);
      if (!(amount > 0 && amount < 100_000)) return [];
      const label =
        `${chunk.slice(0, m.index)} ${chunk.slice(m.index + m[0].length)}`
          .replace(/\$|\b(rm|usd|bucks?|dollars?)\b/gi, " ")
          .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
          .replace(/\s+/g, " ")
          .trim() || "Something";
      return [{ label: label[0].toUpperCase() + label.slice(1), amount, category: categorize(label) }];
    });
}

export type Verdict = "yes" | "tight" | "no";

// Weekly budget maths shared by the hero and the "Can I afford it?" widget.
export function afford(price: number, opts: { left: number; daysLeft: number; weeklyBudget: number }) {
  const { left, daysLeft, weeklyBudget } = opts;
  const perDayAfter = (left - price) / daysLeft;
  const normalDaily = weeklyBudget / 7;
  const verdict: Verdict = price > left ? "no" : perDayAfter < normalDaily * 0.3 ? "tight" : "yes";
  return { verdict, perDayAfter: Math.max(0, perDayAfter) };
}

// Price in hours of work, rounded to the nearest half hour.
export const hoursOfWork = (price: number, hourly: number) => Math.round((price / hourly) * 2) / 2;

export const money = (value: number, currency: string, locale: string) => {
  const n = Math.round(value * 100) / 100; // float sums like 11.999999999999998 -> 12
  return n.toLocaleString(locale, { style: "currency", currency, minimumFractionDigits: n % 1 ? 2 : 0 });
};

export type BillItem<P extends string> = { label: string; cents: number; owner: P | "Shared" };

// Shares in cents. Shared lines (or the whole bill, when even) split between everyone; leftover cents go
// to the payer, so the shares always add up to the bill exactly.
export function splitBill<P extends string>(
  items: BillItem<P>[],
  mode: "even" | "items",
  people: readonly P[],
  payer: P,
): Record<P, number> {
  const out = Object.fromEntries(people.map((p) => [p, 0])) as Record<P, number>;
  let shared = 0;
  for (const it of items) {
    if (mode === "even" || it.owner === "Shared") shared += it.cents;
    else out[it.owner] += it.cents;
  }
  const each = Math.floor(shared / people.length);
  for (const p of people) out[p] += each;
  out[payer] += shared - each * people.length;
  return out;
}
