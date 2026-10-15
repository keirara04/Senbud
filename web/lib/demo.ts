// Landing-page demo logic. Runs entirely in the browser; no AI, no network.

export type Category = "Food" | "Transport" | "Treat" | "Groceries" | "Subscription" | "Other";

export type Item = { label: string; amount: number; category: Category };

const RULES: [RegExp, Category][] = [
  [/bubble ?tea|boba|coffee|kopi|latte|starbucks|cake|ice ?cream|dessert|burger|big ?mac|fries|snack/, "Treat"],
  [/netflix|spotify|youtube|icloud|disney|prime|gym|chatgpt|subscription/, "Subscription"],
  [/grab|uber|lyft|taxi|bus|train|mrt|lrt|metro|petrol|gas|parking|fare/, "Transport"],
  [/grocer|market|tesco|walmart|aldi|lotus|mydin|trader joe|costco/, "Groceries"],
  [/lunch|dinner|breakfast|brunch|food|nasi|mee|pizza|sushi|ramen|mamak|meal|chipotle/, "Food"],
];

export function categorize(label: string): Category {
  const l = label.toLowerCase();
  return RULES.find(([re]) => re.test(l))?.[1] ?? "Other";
}

// "lunch 12, grab 8 and $4.50 kopi" -> 3 items. Chunks without a number are ignored.
export function parseSpending(text: string): Item[] {
  return text
    .split(/,|;|\n|\band\b|\+/i)
    .map((chunk) => chunk.trim())
    .flatMap((chunk) => {
      const m = chunk.match(/(\d+(?:\.\d{1,2})?)/);
      if (!m) return [];
      const amount = Number(m[1]);
      if (!(amount > 0 && amount < 100_000)) return [];
      const label =
        chunk
          .replace(m[0], " ")
          .replace(/\$|\b(rm|usd|bucks?|dollars?)\b/gi, " ")
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

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });
