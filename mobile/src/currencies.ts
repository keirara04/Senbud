// Currencies Senbud offers in its picker (Settings → Currency, onboarding).
// ponytail: a fixed list, Southeast Asia first. Add codes here when someone asks for one.
export const CURRENCIES: [string, string][] = [
  ['MYR', 'Malaysian ringgit'],
  ['SGD', 'Singapore dollar'],
  ['IDR', 'Indonesian rupiah'],
  ['THB', 'Thai baht'],
  ['PHP', 'Philippine peso'],
  ['VND', 'Vietnamese dong'],
  ['BND', 'Brunei dollar'],
  ['USD', 'US dollar'],
  ['GBP', 'British pound'],
  ['EUR', 'Euro'],
  ['AUD', 'Australian dollar'],
  ['NZD', 'New Zealand dollar'],
  ['CAD', 'Canadian dollar'],
  ['JPY', 'Japanese yen'],
  ['KRW', 'South Korean won'],
  ['CNY', 'Chinese yuan'],
  ['HKD', 'Hong Kong dollar'],
  ['TWD', 'New Taiwan dollar'],
  ['INR', 'Indian rupee'],
  ['PKR', 'Pakistani rupee'],
  ['BDT', 'Bangladeshi taka'],
  ['AED', 'UAE dirham'],
  ['SAR', 'Saudi riyal'],
  ['CHF', 'Swiss franc'],
];

export const currencyName = (code: string) => CURRENCIES.find(([c]) => c === code)?.[1] ?? code;

// Quick-pick amounts are student-sized in these; elsewhere the scale differs (IDR, KRW…), so no chips.
// ponytail: a plain allow-list, a per-currency scale table if the chips matter there.
export const SMALL_UNIT = new Set(['MYR', 'SGD', 'BND', 'USD', 'GBP', 'EUR', 'AUD', 'NZD', 'CAD', 'CHF', 'AED', 'SAR']);
