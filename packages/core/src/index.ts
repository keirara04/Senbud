// Senbud's shared money logic, used by web and mobile. Pure functions: no AI, no network, no platform APIs.
export * from "./budget";
export * from "./dates";
export * from "./examples";
export * from "./iou";
export * from "./nudge";
export * from "./recap";
export * from "./reminders";
export * from "./subscriptions";
export type * from "./types";

export type Category = "Food" | "Transport" | "Treat" | "Groceries" | "Subscription" | "Other";

export type Item = { label: string; amount: number; category: Category };

// Whole words only (plus simple plurals), so "business lunch" isn't read as a bus fare.
const RULES: [RegExp, Category][] = (
  [
    // The local examples in mobile/src/currencies.ts must land in the right category here too.
    ["bubble ?tea|boba|coffee|kopi|kopi susu|kape|ca phe|cha yen|milk ?tea|karak|chai|americano|flat white|latte|starbucks|cake|ice ?cream|dessert|burger|big ?mac|fries|snack", "Treat"],
    ["netflix|spotify|youtube|icloud|disney|prime|gym|chatgpt|subscription", "Subscription"],
    ["grab|gojek|dart|didi|careem|uber|lyft|taxi|bus|train|tram|tube|mtr|mrt|lrt|metro|auto|rickshaw|petrol|gas|parking|fare", "Transport"],
    ["grocer(?:y|ies)?|market|tesco|walmart|aldi|lotus|mydin|trader joe|costco", "Groceries"],
    ["lunch|dinner|breakfast|brunch|food|nasi|mee|pizza|sushi|ramen|mamak|meal|chipotle|kimbap|gimbap|kimchi|bibimbap|pho|banh mi|onigiri|noodle|biryani|thali|shawarma|poutine|pie|sandwich|hot ?dog|chicken rice|silog|pad kra pao|baozi|sausage roll", "Food"],
  ] as const
).map(([words, cat]) => [new RegExp(`\\b(?:${words})(?:e?s)?\\b`), cat]);

export function categorize(label: string): Category {
  const l = label.toLowerCase();
  return RULES.find(([re]) => re.test(l))?.[1] ?? "Other";
}

// A whole number or one with up to 2 decimals, not part of a longer number and not negative.
const AMOUNT = /(?<![\d.-])\d+(?:\.\d{1,2})?(?![\d.])/g;

// The biggest believable single amount, per currency: 100,000 at ringgit scale, more where the unit is
// small. Same table as the API's ReceiptController::CAP_SCALE; change both together.
const CAP_SCALE: Record<string, number> = { IDR: 10000, VND: 10000, KRW: 1000, JPY: 100, PKR: 100, INR: 100, BDT: 100 };
export const amountCap = (currency?: string) => 100_000 * (CAP_SCALE[currency?.toUpperCase() ?? ""] ?? 1);

// Currencies with no minor unit, where a dot groups thousands ("150.000 dong").
const NO_DECIMALS = new Set(["IDR", "VND", "KRW", "JPY"]);

// "lunch 12, grab 8 and $4.50 kopi" -> 3 items. Chunks without a valid amount are ignored.
export function parseSpending(text: string, currency?: string): Item[] {
  const grouped = NO_DECIMALS.has(currency?.toUpperCase() ?? "") ? text.replace(/(\d)\.(?=\d{3}\b)/g, "$1") : text;
  return grouped
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // "1,200" -> "1200" before splitting on commas
    .split(/,|;|\n|\band\b|\+/i)
    .map((chunk) => chunk.trim())
    .flatMap((chunk) => {
      const m = [...chunk.matchAll(AMOUNT)].at(-1); // "2 coffees 9" -> 9
      if (!m || m.index === undefined) return [];
      const amount = Number(m[0]);
      if (!(amount > 0 && amount < amountCap(currency))) return [];
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

// Whole amounts drop the decimals ("$12"); others show the currency's own minor digits ("$4.50", but
// "¥5" and "₩33", since JPY and KRW have none).
export const money = (value: number, currency: string, locale: string) => {
  const digits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const n = Math.round(value * 10 ** digits) / 10 ** digits; // float sums like 11.999999999999998 -> 12
  return n.toLocaleString(locale, { style: "currency", currency, minimumFractionDigits: n % 1 ? digits : 0, maximumFractionDigits: digits });
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

// "Export spending (CSV)": one row per expense, amounts in major units, labels quoted when they need it.
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (txns: import("./types").Transaction[], currency: string) =>
  ["date,amount,currency,label,category,source", ...txns.map((x) => [x.date, String(x.cents / 100), currency, csvCell(x.label), x.category, x.source ?? "manual"].join(","))].join("\n");

// What Bud does with a line typed into the assistant, decided by rules, never by AI: a price check, a
// look at the month, a split, quick adds, or a question that needs AI ("ask").
export type Intent =
  | { kind: "afford"; amount?: number; label: string }
  | { kind: "month" }
  | { kind: "split"; amount?: number; label: string; people: string[] }
  | { kind: "add"; items: Item[] }
  | { kind: "spentOn"; query: string }
  | { kind: "biggest" }
  | { kind: "bills" }
  | { kind: "daysLeft" }
  | { kind: "compare" }
  | { kind: "ask" };

const article = (s: string) => s.replace(/^(a|an|the|my)\s+/i, "").replace(/^\p{L}/u, (c) => c.toUpperCase());
// Lines that start like a question or a request go to Bud, never to quick add ("who won the cup in
// 2022" is not a 2022 expense).
const QUESTION = /\?\s*$|^(can|could|should|would|how|what|why|when|where|who|whose|which|is|are|am|was|were|do|does|did|will|tell|explain|write|give|list|help|please|ignore|translate)\b/i;

export const isQuestion = (line: string) => QUESTION.test(line.trim());

export function readIntent(text: string, currency?: string): Intent {
  const line = text.trim();
  if (/\bafford\b|\b(can|could|should) i (buy|get)\b/i.test(line)) {
    const [item] = parseSpending(line.replace(/\b(can|could|should)\s+i\s+(afford|buy|get)\b|\bafford\b/i, " "), currency);
    return item ? { kind: "afford", amount: item.amount, label: article(item.label) } : { kind: "afford", label: "" };
  }
  if (/\bsplit\b/i.test(line)) {
    const [before, after = ""] = line.split(/\bwith\b/i);
    const people = after.split(/,|\band\b|&/i).map((p) => p.replace(/[^\p{L}\s'-]/gu, "").trim()).filter(Boolean);
    const [item] = parseSpending(before.replace(/\bsplit\b/gi, " "), currency);
    return { kind: "split", amount: item?.amount, label: item ? article(item.label) : "", people: people.map(article) };
  }
  // Questions Bud answers from the phone's own numbers. Before "month", so "how much on food" isn't a
  // month summary; "how much is left" stays one.
  const on = line.match(/\b(?:how much (?:(?:did|have) i (?:spend|spent|spending) |(?:have i |i )?(?:spent|spend) )?on|spent on|spending on)\s+(.+?)(?:\s+(?:this|so far|in total)\b.*)?\s*\??$/i);
  if (on && !/\d/.test(on[1])) return { kind: "spentOn", query: on[1].replace(/^(my|the)\s+/i, "").trim() };
  if (/\b(biggest|largest|most expensive)\b.*\b(spend|spends|expense|expenses|purchase|purchases|buy|buys)\b/i.test(line)) return { kind: "biggest" };
  if (/\bwhen(['’]?s| is| are| do)\b.*\b(rent|bills?)\b|\bnext (bill|rent)\b|\b(rent|bills?) due\b|\bwhat bills\b/i.test(line)) return { kind: "bills" };
  if (/\bhow many days\b|\bdays left\b/i.test(line)) return { kind: "daysLeft" };
  if (/\b(last|previous) (week|month|pay period)\b|\bcompared?\b/i.test(line) && isQuestion(line)) return { kind: "compare" };
  if (/\bhow(['’]?s| is| am)\b.*\b(month|week|period|doing|budget)\b|\bwhere did\b.*\bgo\b|\bhow much (is )?left\b/i.test(line)) return { kind: "month" };
  if (isQuestion(line)) return { kind: "ask" };
  const items = parseSpending(line, currency);
  return items.length ? { kind: "add", items } : { kind: "ask" };
}

// Receipts print service charge, SST and rounding under the items, and the reader returns only the
// items. The gap to the printed total becomes one line, so what's saved matches what was paid. It takes
// the category of the biggest item (service on a meal is Food). A total below the items (a discount)
// is left alone: the items are what was bought.
export function withCharges(items: Item[], total: number | null | undefined): Item[] {
  if (!total || !items.length) return items;
  const gap = Math.round(total * 100) - items.reduce((s, i) => s + Math.round(i.amount * 100), 0);
  if (gap <= 0) return items;
  const biggest = items.reduce((a, b) => (b.amount > a.amount ? b : a));
  return [...items, { label: "Service charge and tax", amount: gap / 100, category: biggest.category }];
}
