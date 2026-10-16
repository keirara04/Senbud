// Landing-page demo logic. Runs entirely in the browser; no AI, no network.

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

// Price in hours of work, rounded to the nearest half hour.
export const hoursOfWork = (price: number, hourly: number) => Math.round((price / hourly) * 2) / 2;

export const money = (value: number) => {
  const n = Math.round(value * 100) / 100; // float sums like 11.999999999999998 -> 12
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });
};

export type Person = "You" | "Jordan" | "Sarah";
export const PEOPLE: Person[] = ["You", "Jordan", "Sarah"];
export type Owner = Person | "Shared";
export type BillItem = { label: string; cents: number; owner: Owner };

// Shares in cents. Shared lines (or the whole bill, when even) split three ways; leftover cents go to
// "You", who paid, so the shares always add up to the bill exactly.
export function splitBill(items: BillItem[], mode: "even" | "items"): Record<Person, number> {
  const out: Record<Person, number> = { You: 0, Jordan: 0, Sarah: 0 };
  let shared = 0;
  for (const it of items) {
    if (mode === "even" || it.owner === "Shared") shared += it.cents;
    else out[it.owner] += it.cents;
  }
  const each = Math.floor(shared / PEOPLE.length);
  for (const p of PEOPLE) out[p] += each;
  out.You += shared - each * PEOPLE.length;
  return out;
}
