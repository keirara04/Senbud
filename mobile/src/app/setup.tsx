import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { eraseAll, loadApp, loadSetup, saveSetup, setPro } from '@/db';
import { Button, Card, Field, Screen, Segmented, T, TextButton } from '@/ui';

// "12.50" or "12,50" -> 1250 cents; anything else -> NaN.
const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);
const fromCents = (n: number) => String(n / 100);

type Errors = Partial<Record<'limit' | 'rent' | 'dueDay' | 'currency', string>>;

export default function SetupScreen() {
  const db = useSQLiteContext();
  const device = getLocales()[0];
  const [kind, setKind] = useState<'week' | 'month'>('week');
  const [limit, setLimit] = useState('');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [currency, setCurrency] = useState(device.currencyCode ?? 'USD');
  const [errors, setErrors] = useState<Errors>({});
  const [pro, setProState] = useState(false);

  useEffect(() => {
    loadApp(db).then((a) => setProState(a.pro));
    loadSetup(db).then((s) => {
      if (!s) return;
      setKind(s.budget.period.kind);
      setLimit(fromCents(s.budget.cents));
      setCurrency(s.profile.currency);
      if (s.rent) {
        setRent(fromCents(s.rent.cents));
        setDueDay(String(s.rent.dueDay));
      }
    });
  }, [db]);

  async function save() {
    const cents = toCents(limit);
    const rentCents = rent.trim() ? toCents(rent) : 0;
    const day = Number(dueDay);
    const e: Errors = {};
    if (!(cents > 0)) e.limit = `Enter how much you can spend per ${kind}.`;
    if (!(rentCents >= 0)) e.rent = 'Enter a number, or leave it empty.';
    if (rentCents > 0 && !(Number.isInteger(day) && day >= 1 && day <= 31)) e.dueDay = 'A day from 1 to 31.';
    if (!/^[A-Za-z]{3}$/.test(currency)) e.currency = 'A 3-letter code, like USD or MYR.';
    setErrors(e);
    if (Object.keys(e).length) return;
    await saveSetup(db, {
      // Weeks start on Monday, months on the 1st, until settings need more.
      budget: { cents, period: kind === 'week' ? { kind, startWeekday: 1 } : { kind, startDay: 1 } },
      rent: rentCents > 0 ? { name: 'Rent', cents: rentCents, dueDay: day } : null,
      profile: { currency: currency.toUpperCase(), locale: device.languageTag },
    });
    // Opened from Home: go back. Redirected here on first run: there's nothing behind us.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function erase() {
    Alert.alert('Erase all data?', 'Every expense, budget and bill on this phone is deleted. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          await eraseAll(db);
          setLimit('');
          setRent('');
        },
      },
    ]);
  }

  return (
    <Screen>
      <T variant="title">How much can you spend?</T>
      <T tone="textDim">Senbud works out what’s safe to spend each day. Rent is set aside first.</T>

      <Card>
        <Segmented
          options={[
            { value: 'week', label: 'Per week' },
            { value: 'month', label: 'Per month' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Field label={`Budget per ${kind}`} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder={kind === 'week' ? '100' : '1000'} error={errors.limit} />
      </Card>

      <Card>
        <Field label="Monthly rent (optional)" value={rent} onChangeText={setRent} keyboardType="decimal-pad" placeholder="650" error={errors.rent} />
        <Field label="Rent due on day" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="1" error={errors.dueDay} />
      </Card>

      <Card>
        <Field label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} error={errors.currency} />
      </Card>

      <Button title="Save" onPress={save} />
      <Button title="Erase all data" variant="danger" onPress={erase} />
      {/* ponytail: dev-only Pro switch until RevenueCat (Phase 2 C) owns this flag. */}
      {__DEV__ && (
        <TextButton
          title={`Dev: Pro is ${pro ? 'on' : 'off'}`}
          tone="textDim"
          onPress={async () => {
            await setPro(db, !pro);
            setProState(!pro);
          }}
        />
      )}
    </Screen>
  );
}
