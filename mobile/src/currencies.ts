import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadProfile } from '@/db';

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

// Example amounts and words (quick picks, placeholders, "coffee 4.50") live in core, next to the
// category rules they must agree with.
export { dinnerExample, drinkExample, localAmount, mealExample, quickAddExample, treatExample, typed } from '@senbud/core';

// The profile's currency for screens that only need it for examples. undefined until it loads.
export function useCurrency() {
  const db = useSQLiteContext();
  const [code, setCode] = useState<string>();
  useEffect(() => {
    loadProfile(db).then((p) => setCode(p?.currency));
  }, [db]);
  return code;
}
