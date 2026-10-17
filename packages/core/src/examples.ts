// Example amounts and words for the app's copy, sized and named for where the user spends.
// Mobile shows them (mobile/src/currencies.ts re-exports these); the test keeps them filing correctly.

// Example amounts in the copy (quick picks, placeholders, "kopi 4.50") are written at ringgit scale.
// SCALE says what the same everyday thing roughly costs in each currency: a coffee is about 4.50 in
// ringgit or dollars, 6,800 won, 23,000 rupiah. Price level, not the exchange rate. Missing = 1.
// ponytail: hand-set guesses; tune a market's number when its users say the suggestions look off.
const SCALE: Record<string, number> = {
  AUD: 1.5, NZD: 1.5, CAD: 1.5, AED: 3, SAR: 3,
  THB: 15, PHP: 30, IDR: 5000, VND: 6000, JPY: 150, KRW: 1500,
  CNY: 6, HKD: 8, TWD: 30, INR: 50, PKR: 150, BDT: 60,
};

// A ringgit-scale amount in `code`, rounded to two significant figures (4.50 -> 6,800 won).
export function localAmount(base: number, code: string | undefined) {
  const f = (code && SCALE[code]) || 1;
  if (f === 1) return base;
  const v = base * f;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / step) * step;
}

// The same, as someone would type it: "4.50", "6800". No thousands separators, so it parses back.
export const typed = (base: number, code: string | undefined) => {
  const v = localAmount(base, code);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

// Examples people would actually type where they spend this currency: a drink, a ride, a cheap meal,
// a treat and a dinner out, at local prices. The currency stands in for the place: it's what they spend.
// ponytail: one line per currency, hand-written; fix a line when a market says it reads wrong.
// Every word here must be in core's category rules (packages/core/src/index.ts) so it files correctly.
type Local = { drink: [string, number]; ride: [string, number]; meal: [string, number]; treat: string; dinner: string };
export const LOCAL: Record<string, Local> = {
  MYR: { drink: ['kopi', 4.5], ride: ['grab', 12], meal: ['nasi lemak', 6.5], treat: 'Tealive brown sugar', dinner: 'Dinner at Ali Maju' },
  SGD: { drink: ['kopi', 1.8], ride: ['grab', 15], meal: ['chicken rice', 5], treat: 'Bubble tea', dinner: 'Hawker dinner' },
  BND: { drink: ['kopi', 2], ride: ['dart', 10], meal: ['nasi katok', 2], treat: 'Bubble tea', dinner: 'Dinner at the night market' },
  IDR: { drink: ['kopi susu', 18000], ride: ['gojek', 15000], meal: ['nasi goreng', 25000], treat: 'Boba', dinner: 'Dinner at the warung' },
  THB: { drink: ['cha yen', 45], ride: ['grab', 80], meal: ['pad kra pao', 60], treat: 'Mango sticky rice', dinner: 'Mookata night' },
  PHP: { drink: ['kape', 120], ride: ['grab', 200], meal: ['silog', 120], treat: 'Halo-halo', dinner: 'Samgyup night' },
  VND: { drink: ['ca phe', 30000], ride: ['grab', 40000], meal: ['pho', 50000], treat: 'Milk tea', dinner: 'Hotpot night' },
  USD: { drink: ['coffee', 4.5], ride: ['uber', 15], meal: ['hot dog', 5], treat: 'Boba', dinner: 'Pizza night' },
  GBP: { drink: ['coffee', 3.5], ride: ['bus', 1.75], meal: ['meal deal', 3.85], treat: 'Cinema ticket', dinner: 'Curry night' },
  EUR: { drink: ['coffee', 3], ride: ['metro', 2.1], meal: ['sandwich', 6], treat: 'Gelato', dinner: 'Pizza night' },
  AUD: { drink: ['flat white', 5], ride: ['uber', 18], meal: ['sausage roll', 6], treat: 'Bubble tea', dinner: 'Thai night' },
  NZD: { drink: ['flat white', 5.5], ride: ['bus', 3], meal: ['pie', 6], treat: 'Ice cream', dinner: 'Fish and chips' },
  CAD: { drink: ['coffee', 3], ride: ['uber', 15], meal: ['poutine', 12], treat: 'Timbits', dinner: 'Sushi night' },
  JPY: { drink: ['coffee', 150], ride: ['train', 220], meal: ['onigiri', 180], treat: 'Purikura', dinner: 'Izakaya night' },
  KRW: { drink: ['americano', 4500], ride: ['taxi', 12000], meal: ['kimbap', 4000], treat: 'Bingsu', dinner: 'Samgyeopsal night' },
  CNY: { drink: ['milk tea', 18], ride: ['didi', 20], meal: ['baozi', 6], treat: 'Hotpot', dinner: 'Hotpot night' },
  HKD: { drink: ['milk tea', 25], ride: ['mtr', 12], meal: ['noodles', 45], treat: 'Egg waffle', dinner: 'Dim sum' },
  TWD: { drink: ['bubble tea', 60], ride: ['mrt', 25], meal: ['beef noodles', 150], treat: 'Shaved ice', dinner: 'Night market' },
  INR: { drink: ['chai', 20], ride: ['auto', 80], meal: ['thali', 150], treat: 'Movie ticket', dinner: 'Biryani night' },
  PKR: { drink: ['chai', 80], ride: ['careem', 400], meal: ['biryani', 350], treat: 'Kulfi', dinner: 'BBQ night' },
  BDT: { drink: ['chai', 20], ride: ['rickshaw', 60], meal: ['biryani', 250], treat: 'Fuchka', dinner: 'Kacchi night' },
  AED: { drink: ['karak', 2], ride: ['careem', 25], meal: ['shawarma', 10], treat: 'Coffee', dinner: 'Brunch' },
  SAR: { drink: ['coffee', 15], ride: ['careem', 30], meal: ['shawarma', 12], treat: 'Kunafa', dinner: 'Mandi night' },
  CHF: { drink: ['coffee', 5], ride: ['tram', 3], meal: ['sandwich', 9], treat: 'Chocolate', dinner: 'Fondue night' },
};
// Anything not listed: plain words, amounts scaled from ringgit.
const local = (code: string | undefined): Local =>
  (code && LOCAL[code]) || { drink: ['coffee', localAmount(4.5, code)], ride: ['bus', localAmount(2, code)], meal: ['lunch', localAmount(8, code)], treat: 'Bubble tea', dinner: 'Dinner out' };

const say = ([name, amount]: [string, number]) => `${name} ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

// "coffee 4.50, uber 15" in dollars, "kopi 4.50, grab 12" in ringgit, "americano 4500, taxi 12000" in won.
export const quickAddExample = (code: string | undefined) => `${say(local(code).drink)}, ${say(local(code).ride)}`;
// One cheap local meal: "hot dog 5", "nasi lemak 6.50", "kimbap 4000".
export const mealExample = (code: string | undefined) => say(local(code).meal);
// One drink: "coffee 4.50", "kopi 4.50", "chai 20".
export const drinkExample = (code: string | undefined) => say(local(code).drink);
export const treatExample = (code: string | undefined) => local(code).treat;
export const dinnerExample = (code: string | undefined) => local(code).dinner;
