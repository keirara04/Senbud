// Senbud's shared money logic, used by web and mobile. Pure functions: no AI, no network, no platform APIs.
export * from "./budget";
export * from "./csv";
export * from "./dates";
export * from "./examples";
export * from "./iou";
export * from "./nudge";
export * from "./recap";
export * from "./reminders";
export * from "./subscriptions";
export type * from "./types";

export type Category = "Food" | "Transport" | "Treat" | "Groceries" | "Subscription" | "Other";
export const CATEGORY_NAMES: Category[] = ["Food", "Transport", "Treat", "Groceries", "Subscription", "Other"];

export type Item = { label: string; amount: number; category: Category };

// Whole words only (plus simple plurals), so "business lunch" isn't read as a bus fare.
const RULES: [RegExp, Category][] = (
  [
    // The local examples in mobile/src/currencies.ts must land in the right category here too.
    // Delivery first, so "GRAB*FOOD" on a bank statement is food, not a ride.
    ["grab\\W?food|food ?panda|deliveroo|uber ?eats|doordash|shopee ?food|swiggy|zomato", "Food"],
    // Malay groceries before Transport, so cooking oil ("minyak masak") isn't petrol ("minyak").
    ["minyak masak|barang dapur|barang basah|barang runcit|kedai runcit|runcit|99 ?speed ?mart|speedmart|econsave|jaya grocer|village grocer|nsk|aeon big|aeon|tong gas|gas dapur|lulu|the store|tf value ?mart|cold storage|mercato|gardenia|massimo|pasar basah|wet market|sabun|syampu|shampoo|ubat gigi|tisu|detergent|lampin|pampers|beras|tepung|sayur(?:an)?", "Groceries"],
    ["bubble ?tea|boba|coffee|tealive|chatime|gong ?cha|tiger sugar|koi|zus|tim hortons|dunkin|kopi|kopi susu|kape|ca phe|cha yen|milk ?tea|karak|chai|americano|flat white|latte|starbucks|cake|ice ?cream|dessert|burger|big ?mac|fries|snack|teh|teh tarik|teh o|milo|neslo|nescafe|cendol|ais kacang|abc|ais ?krim|aiskrim|kek|kuih|keropok|jajan|snek|coklat|chocolate|minum|minuman|ais|bandung|sirap|air tebu|air kelapa|tealive|bask bear|llao llao|mixue|richiamo|chagee|kenangan|luckin|coffee bean|air (?:kosong|mineral|botol|sejuk|suam|tin|soya|batu)|wayang|movie|cinema|gsc|tgv|mbo|karaoke|ktv|bowling|futsal|badminton|concert|konsert|top ?up game|mlbb|steam wallet|shopee|lazada|tiktok shop|zalora|baju|kasut|seluar|tudung|shoes|clothes|barber|gunting rambut|salon|7 ?-?eleven|seven ?eleven|family ?mart|kk ?mart|mynews", "Treat"],
    ["netflix|spotify|youtube|icloud|disney|prime|gym|chatgpt|subscription|langganan|astro|unifi|maxis|hotlink|celcom|xpax|digi|celcomdigi|u ?mobile|yes [45]g|tune ?talk|redone|yoodo|sooka|viu|iqiyi|prepaid|postpaid|tnb|air selangor|syabas|indah water|iwk|bil (?:api|air|elektrik|letrik|tnb|phone|fon|telefon|internet|wifi|astro|unifi)|ptptn|wifi|internet", "Subscription"],
    ["grab|gojek|dart|didi|careem|uber|lyft|taxi|bus|train|tram|tube|mtr|mrt|lrt|metro|auto|rickshaw|petrol|gas|parking|fare|bas|teksi|tambang|minyak|isi minyak|tol|toll|parkir|komuter|ktm|ets|rapid ?kl|touch ?n ?go|tng|indrive|maxim|e-?hailing|grab ?(?:car|bike)|ron ?9[57]|monorail|brt|my ?50|my ?30|servis motor|servis kereta|service motor|minyak hitam|tayar|airasia|flight|ferry|feri|roadtax|road tax|cukai jalan", "Transport"],
    ["grocer(?:y|ies)?|market|tesco|walmart|aldi|lotus|mydin|trader joe|costco", "Groceries"],
    ["lunch|dinner|breakfast|brunch|food|kopitiam|hawker|restaurant|cafe|mcdonald'?s?|mcd|kfc|subway|nasi|mee|pizza|sushi|ramen|mamak|meal|chipotle|kimbap|gimbap|kimchi|bibimbap|pho|banh mi|onigiri|noodle|biryani|thali|shawarma|poutine|pie|sandwich|hot ?dog|chicken rice|silog|pad kra pao|baozi|sausage roll|makan|mkn|makanan|sarapan|tengah ?hari|makan malam|roti|roti canai|capati|thosai|tosai|bihun|mi|maggi|kuey ?teow|kueyteow|laksa|satay|sate|ayam|ikan|lauk|tapau|bungkus|warung|gerai|kedai makan|pasar malam|nandos|marrybrown|secret recipe|oldtown|old town|pappa ?rich|texas chicken|domino'?s?|pizza hut|ramly|supper|sahur|berbuka|iftar|moreh|murtabak|chapati|ckt|char kuey teow|mihun|mee ?hoon|dim sum|yong tau foo|ytf|chicken chop|mekdi|kenny rogers|ayam gepuk", "Food"],
    // Last, so "roti telur", "kopi susu" and "giant pizza" keep their own category.
    ["telur|gula|susu|garam|kicap|giant|hero", "Groceries"],
  ] as const
).map(([words, cat]) => [new RegExp(`\\b(?:${words})(?:e?s)?\\b`), cat]);

export function categorize(label: string): Category {
  const l = label.toLowerCase();
  return RULES.find(([re]) => re.test(l))?.[1] ?? "Other";
}

// A whole number or one with up to 2 decimals, not part of a longer number and not negative. "1k" and
// "1.5k" are thousands; "50 sen" is half a ringgit.
const AMOUNT = /(?<![\d.-])\d+(?:\.\d{1,2})?(?!\d|\.\d)(?:k\b|\s?sen\b)?/gi;
const amountOf = (raw: string) => {
  const n = parseFloat(raw);
  return /k$/i.test(raw) ? n * 1000 : /sen$/i.test(raw) ? n / 100 : n;
};

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
    // Malay "dan" / "n" join items only after an amount ("roti 2 dan teh 3"), so "lunch with dan 20" stays one.
    .replace(/(\d(?:k|\s?sen)?)\s+(?:dan|n)\s+/gi, "$1, ")
    .split(/,|;|\n|\band\b|\+|\s&\s/i) // "h&m 50" stays one item
    .map((chunk) => chunk.trim())
    .flatMap((chunk) => {
      const m = [...chunk.matchAll(AMOUNT)].at(-1); // "2 coffees 9" -> 9
      if (!m || m.index === undefined) return [];
      const amount = Math.round(amountOf(m[0]) * 100) / 100;
      if (!(amount > 0 && amount < amountCap(currency))) return [];
      const label =
        `${chunk.slice(0, m.index)} ${chunk.slice(m.index + m[0].length)}`
          .replace(/\$|\b(rm|usd|bucks?|dollars?|ringgit|hinggit|inggit|hengget|sgd)\b/gi, " ")
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
  | { kind: "budget"; amount?: number; period?: "week" | "month" | "until"; category?: Category }
  | { kind: "ask" };

// Malay and bahasa pasar sit inside each rule below, next to the English, so the order that keeps
// "lunch last week 20" a quick add holds for "makan bulan lepas 20" too.
// Malay words for "how much": berapa and its short forms.
const BERAPA = String.raw`berapa|brp|bape|bpe|brape|how much`;
// Category names as people type them, English or Malay, for "how much on makan" and limits.
const CATEGORY_WORDS: [RegExp, Category][] = [
  [/^(?:food|foods|meals?|makan|makanan|mkn)$/, "Food"],
  [/^(?:transport|transports|travel|tambang|pengangkutan|kenderaan|minyak|petrol)$/, "Transport"],
  [/^(?:treats?|snacks?|jajan|snek|hiburan|shopping)$/, "Treat"],
  [/^(?:grocer(?:y|ies)|barang dapur|dapur|runcit|barang runcit)$/, "Groceries"],
  [/^(?:subscriptions?|subs|langganan|bil|bills|komitmen)$/, "Subscription"],
  [/^(?:others?|lain|lain-lain|lain lain)$/, "Other"],
];
/** "food", "treats", "makan", "barang dapur" -> the category, else undefined. Tries the first word alone too. */
export function categoryNamed(words: string): Category | undefined {
  const w = words.trim().toLowerCase();
  const find = (x: string) => CATEGORY_WORDS.find(([re]) => re.test(x))?.[1];
  return find(w) ?? find(w.split(/\s+/)[0]);
}

// "I only want to spend 100 this week", "set my budget to 1000 a month", "200 on food this month";
// "aku nak belanja 100 je minggu ni", "bajet 1k sebulan", "limit makan 200".
const BUDGET = new RegExp(
  [
    String.raw`\b(?:want|wanna|going|trying|planning|plan) to spend\b`,
    String.raw`\bspend (?:only|at most|max(?:imum)?|no more than|under|less than)\b`,
    String.raw`\b(?:set|change|make|put|update|move|lower|raise) (?:my |the )?(?:overall |weekly |monthly )?budget\b`,
    String.raw`\bbudget (?:is|to|of|at|for|=)`,
    String.raw`\bnew budget\b`,
    String.raw`\blimit (?:myself )?to\b`,
    String.raw`\b(?:nak|nk|mau|mahu|plan|target)\s+(?:belanja|spend|habiskan)\b`,
    String.raw`\b(?:belanja|spend)\s+(?:tak|x|tidak|jangan)\s+lebih\b`,
    String.raw`\b(?:belanja|spend)\s+(?:maksimum|max|paling banyak|bawah|kurang dari)\b`,
    String.raw`\b(?:tukar|ubah|letak|tetapkan|buat)\s+(?:bajet|budget)\b`,
    String.raw`\bbajet\b`,
    String.raw`\b(?:budget|max|target)\s+(?:untuk\s+|utk\s+)?(?:makan|mkn|makanan|belanja|jajan|snek|transport|tambang|runcit|barang dapur|langganan|food|treats?|grocer(?:y|ies))\b.*\d`,
    // Malay "had" (limit) only before a Malay word: English "had food 12" is a quick add.
    String.raw`\bhad\s+(?:untuk\s+|utk\s+)?(?:makan|mkn|makanan|belanja|jajan|snek|tambang|runcit|barang dapur|langganan)\b.*\d`,
    String.raw`\d\s*(?:je\s+|jer\s+)?(?:sampai|smpai|sblm|sebelum|hingga)\s+gaji\b`,
    String.raw`\b(?:jangan|jgn)\s+(?:lebih|lbh)\b`,
    String.raw`\btarget\s+(?:rm\s*)?\d+(?:\.\d+)?k?\s*(?:se(?:hari|minggu|bulan)|(?:bulan|minggu) ni|a (?:week|month)|this (?:week|month))`,
    String.raw`\bmax\s+(?:rm\s*)?\d+\s*(?:se(?:hari|minggu|bulan)|utk|untuk)`,
    String.raw`\blimit\s+(?:untuk\s+|utk\s+|for\s+)?(?:makan|makanan|food|transport|tambang|treats?|jajan|grocer(?:y|ies)|barang dapur|runcit|langganan|subscriptions?)\b`,
  ].join("|"),
  "i",
);

// Can I afford it: English, or Malay "boleh ke aku beli", "mampu ke", "beli kasut 80 boleh tak".
const AFFORD = new RegExp(
  [
    String.raw`\bafford\b`,
    String.raw`\b(?:can|could|should) i (?:buy|get|beli)\b`,
    String.raw`\bmampu\b`,
    String.raw`\b(?:lepas|cukup|worth|berbaloi)\s+(?:ke|ker|tak|x)\b.*\bbeli\b`,
    String.raw`\bbeli\s+(?:ke|ker)\s+(?:tak|x)\b`,
    String.raw`\bbeli\b.*\b(?:boleh|blh|bleh|ok|mampu|lepas)\s*\?\s*$`,
    String.raw`\bworth\s+(?:it\s*)?(?:ke|tak|x|\?)`,
    String.raw`\b(?:boleh(?:kah)?|blh|bleh|leh|bole|patut|ok|okay)\b(?:\s+(?:ke|ker|kah|tak|x|tidak))?\s+(?:(?:aku|saya|sy|ak|i|kita|gua)\s+)?(?:(?:nak|nk|mau)\s+)?(?:beli|ambil|amik|order|tapau|dapat|grab)\b`,
    String.raw`\b(?:beli|ambil|amik|order|tapau)\b.*\b(?:boleh|bleh|leh|ok|okay|mampu|patut)\s*(?:ke|ker|kah|tak|x|tidak)\s*\??$`,
  ].join("|"),
  "i",
);
// Words around the price that aren't the thing: "boleh ke aku beli kasut tu 80" -> "Kasut".
const AFFORD_FILLER = /\b(?:can|could|should)\s+i\s+(?:afford|buy|get|beli)\b|\b(?:afford|worth|it|berbaloi|lepas|cukup|duit|boleh(?:kah)?|blh|bleh|leh|bole|mampu|patut|ok|okay|ke|ker|kah|tak|x|tidak|aku|saya|sy|ak|kita|gua|nak|nk|mau|beli|ambil|amik|order|tapau|dapat|tu|ni|ini|itu|je|jer|lah|kot|kat|dekat|kt|dkt|sekarang)\b/gi;

const article = (s: string) => s.replace(/^(a|an|the|my)\s+/i, "").replace(/^\p{L}/u, (c) => c.toUpperCase());
// Lines that start like a question or a request go to Bud, never to quick add ("who won the cup in
// 2022" is not a 2022 expense).
const QUESTION = /\?\s*$|^(can|could|should|would|how|what|why|when|where|who|whose|which|is|are|am|was|were|do|does|did|will|tell|explain|write|give|list|help|please|ignore|translate|boleh|bolehkah|blh|bleh|mampu|apa|apakah|ape|siapa|sape|mana|adakah|ada ke|patut ke|tolong|terangkan|jelaskan|tulis|senaraikan)\b/i;
// Malay asks with words anywhere in the line ("aku boleh ke beli kasut 80", "bajet aku brp"). Only pairs
// and question words: a lone "ke" is "to" ("grab ke kampus 12") and a lone "x" is "2 x nasi lemak".
const QUESTION_MS = new RegExp(String.raw`\b(?:boleh(?:kah)?|blh|bleh|leh|bole|mampu|patut|ok|okay|afford|lepas|cukup|worth)\s*(?:ke|ker|kah|tak|x|tidak)\b|\b(?:${BERAPA}|camne|cmne|camana|macam ?mana|mcm ?mana|kenapa|knp|mengapa|bila|bile)\b`, "i");

export const isQuestion = (line: string) => QUESTION.test(line.trim()) || QUESTION_MS.test(line);

export function readIntent(text: string, currency?: string): Intent {
  const line = text.trim();
  const digits = /\d/.test(line);
  if (AFFORD.test(line)) {
    const [item] = parseSpending(line.replace(AFFORD_FILLER, " "), currency);
    return item ? { kind: "afford", amount: item.amount, label: article(item.label) } : { kind: "afford", label: "" };
  }
  if (/\b(?:split|kongsi|bahagi)\b/i.test(line) || /\b(?:share|bayar dulu|cover dulu)\b.*\b(?:with|dengan|dgn|ngan)\b/i.test(line)) {
    const [before, after = ""] = line.split(/\b(?:with|dengan|dgn|ngan)\b/i);
    // "dan" and "n" join names only after a Malay "dengan": "split with dan and sarah" keeps Dan.
    const malay = /\b(?:dengan|dgn|ngan)\b/i.test(line);
    const people = after.split(malay ? /,|\band\b|\bdan\b|\bn\b|&/i : /,|\band\b|&/i).map((p) => p.replace(/[^\p{L}\s'-]/gu, "").trim()).filter(Boolean);
    const [item] = parseSpending(before.replace(/\b(?:split|kongsi|bahagi|share|aku bayar dulu|bayar dulu|cover dulu)\b/gi, " "), currency);
    return { kind: "split", amount: item?.amount, label: item ? article(item.label) : "", people: people.map(article) };
  }
  // "what's my budget for the week?" is a question, not a new budget: questions need an amount.
  const MONTH_EARLY = new RegExp(String.raw`\b(?:status|keadaan|semak|check|tengok|tgk)\s+(?:bajet|budget)\b|\b(?:bajet|budget|duit)\b.*\b(?:camne|cmne|camana|macam ?mana|mcm ?mana|ok (?:ke|x|tak))\b|\b(?:ok|okay)\s+(?:ke|x|tak)\b.*\b(?:bajet|budget)\b`, "i");
  if (!digits && MONTH_EARLY.test(line)) return { kind: "month" };
  if (!digits && /\bpaling\s+(?:mahal|banyak|byk|bnyk|besar)\b/i.test(line)) return { kind: "biggest" };
  const budget = BUDGET.test(line);
  const [item] = budget ? parseSpending(line, currency) : [];
  if (budget && (item || !isQuestion(line))) {
    const period = /\b(?:until|till|til) pay ?day\b|\bpay period\b|\b(?:sampai|smpai|hingga|till|til|until|sebelum|sblm|before)\s+(?:hari\s+)?gaji\b/i.test(line)
      ? "until"
      : /\bweek(?:ly)?\b|\/ ?wk\b|\b(?:minggu|seminggu|mgu|mingguan|smggu)\b/i.test(line)
        ? "week"
        : /\bmonth(?:ly)?\b|\b(?:bulan|sebulan|bln|bulanan|sbln)\b/i.test(line)
          ? "month"
          : undefined;
    // "on food" or "untuk makan" makes it a category limit; "on bubble tea" is a place, not a budget, so
    // Bud asks. "bajet makan 200" names the category straight after.
    const on = line.match(/\b(?:on|for|untuk|utk|kat|dekat|kt|pada|bagi) (?:my |the )?([\p{L}-]+(?: [\p{L}-]+)?)/iu)?.[1].toLowerCase();
    const named = line.match(/\b(?:bajet|budget|limit|had|max|target)\s+(?:untuk\s+|utk\s+|for\s+)?([\p{L}-]+(?: [\p{L}-]+)?)/iu)?.[1];
    const category = (on && categoryNamed(on)) || (named && categoryNamed(named)) || undefined;
    // No per-day budgets: "jgn lebih 20 sehari" would print as "20 a month".
    if (!period && /\b(?:sehari|a day|per day|daily|harian)\b/i.test(line)) return { kind: "ask" };
    if (on && !category && !/^(?:a|the|this|next|each|every|per) |^(?:week|month|now|today|pay|minggu|bulan|hari|seminggu|sebulan|gaji|ni|tu|je|jer|sahaja|aku|saya|diri)/.test(on)) return { kind: "ask" };
    return { kind: "budget", amount: item?.amount, period, category };
  }
  // Questions Bud answers from the phone's own numbers. Before "month", so "how much on food" isn't a
  // month summary; "how much is left" stays one.
  const on = line.match(/\b(?:how much (?:(?:did|have) i (?:spend|spent|spending) |(?:have i |i )?(?:spent|spend) )?on|spent on|spending on)\s+(.+?)(?:\s+(?:this|so far|in total)\b.*)?\s*\??$/i);
  if (on && !/\d/.test(on[1])) return { kind: "spentOn", query: on[1].replace(/^(my|the)\s+/i, "").trim() };
  // "berapa dah belanja kat makan bulan ni", "brp habis untuk grab". Not "berapa baki untuk minggu ni".
  const kat = line.match(new RegExp(String.raw`\b(?:${BERAPA})\b.*?\b(?:kat|dekat|kt|dkt|untuk|utk|on|pada|for)\s+(.+?)(?:\s+(?:bulan|minggu|bln|mgu|setakat|so far|this|ni|tahun)\b.*)?\s*\??$`, "i"));
  const katQuery = kat?.[1].replace(/^(my|the)\s+/i, "").trim();
  if (katQuery && !/\d/.test(katQuery) && !/^(?:minggu|bulan|bln|mgu|hari|ni|lepas|lalu|gaji|tahun|week|month|day|year)\b/i.test(katQuery)) return { kind: "spentOn", query: katQuery };
  const cw = line.match(new RegExp(String.raw`(?:\b(?:${BERAPA})\b.*\b(?:habis|belanja|spend|guna)\s+|\b(?:total|jumlah)\s+)(?:kat\s+|utk\s+|untuk\s+)?(makan|mkn|makanan|jajan|snek|transport|tambang|runcit|barang dapur|langganan|food|treats?|grocer(?:y|ies))\b`, "i"));
  if (!digits && cw) return { kind: "spentOn", query: cw[1] };
  // "limit grab 100" names a place, not a category: Bud takes it rather than saving a 100 expense.
  if (/\blimit\s+\S+\s+(?:rm\s*)?\d/i.test(line) && !BUDGET.test(line)) return { kind: "ask" };
  if (/\b(biggest|largest|most expensive)\b.*\b(spend|spends|expense|expenses|purchase|purchases|buy|buys)\b/i.test(line) || (!digits && /\b(?:paling|yang paling)\s+(?:mahal|banyak|byk|bnyk|besar)\b|\b(?:termahal|terbesar|terbanyak)\b/i.test(line)))
    return { kind: "biggest" };
  if (/\bwhen(['’]?s| is| are| do)\b.*\b(rent|bills?)\b|\bnext (bill|rent)\b|\b(rent|bills?) due\b|\bwhat bills\b|\b(?:bila|bile)\b.*\b(?:sewa|rent|bil|bills?)\b|\b(?:sewa|rent|bil|bills?)\b.*\b(?:bila|bile)\b|\bbil (?:apa|seterusnya)\b/i.test(line)) return { kind: "bills" };
  if (new RegExp(String.raw`\bhow many days\b|\bdays left\b|\b(?:${BERAPA})\s+hari\b|\bhari\s+(?:lagi|lg)\b|\b(?:bila|bile)\b.*\b(?:gaji|elaun)\b`, "i").test(line)) return { kind: "daysLeft" };
  if ((/\b(last|previous) (week|month|pay period)\b|\bcompared?\b/i.test(line) && isQuestion(line)) || (/\b(?:bulan|minggu|bln|mgu) (?:lepas|lalu|lps)\b|\b(?:ber)?banding/i.test(line) && (isQuestion(line) || !digits))) return { kind: "compare" };
  if (
    /\bhow(['’]?s| is| am)\b.*\b(month|week|period|doing|budget)\b|\bwhere did\b.*\bgo\b|\bhow much (is )?left\b/i.test(line) ||
    new RegExp(String.raw`\btinggal\s+(?:${BERAPA})\b|\b(?:${BERAPA})\s+(?:lagi\s+)?(?:tinggal|baki|lagi)\b|\b(?:macam ?mana|mcm ?mana|camne|cmne|camana|gane)\b.*\b(?:bulan|minggu|bajet|budget|duit|kewangan|belanja|aku)\b|\bduit\b.*\b(?:pergi|habis|lesap|hilang)\b.*\bmana\b|\b(?:habis|pergi|lesap|lari)\s+(?:kat\s+|ke\s+)?mana\b|\bada\s+(?:lagi|lg)\s+(?:tak|x)\s+duit\b|\b(?:total|jumlah|dah habis|dh habis|dah spend|dh spend|dah belanja|dh belanja)\b.*\b(?:${BERAPA})\b`, "i").test(line) ||
    (!digits && /\b(?:baki|balance)\b/i.test(line))
  )
    return { kind: "month" };
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
