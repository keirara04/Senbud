// Hourly rate (Settings → Money). Only used by "Can I afford it?" to say what a price costs in hours.
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadApp, setHourlyRate } from '@/db';
import { Button, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function RateSheet() {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState('');
  const [had, setHad] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApp(db).then((a) => {
      setHad(!!a.hourlyRateCents);
      setAmount(a.hourlyRateCents ? String(a.hourlyRateCents / 100) : '');
    });
  }, [db]);

  async function save() {
    const cents = toCents(amount);
    if (!(cents > 0)) return setError('Enter what you earn in an hour, like 10.');
    await setHourlyRate(db, cents);
    router.back();
  }

  async function remove() {
    await setHourlyRate(db, null);
    router.back();
  }

  return (
    <Screen>
      <Field label="What you earn in an hour" value={amount} onChangeText={(v) => (setAmount(v), setError(''))} keyboardType="decimal-pad" placeholder="10" error={error} autoFocus />
      <T variant="caption" tone="textDim">
        Can I afford it? uses this to show prices in hours of work. It stays on this phone.
      </T>
      <Button title="Save" onPress={save} />
      {had && <Button title="Remove hourly rate" variant="danger" onPress={remove} />}
    </Screen>
  );
}
