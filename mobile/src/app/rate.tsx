// Pay per hour (Settings → Money). Optional. Only used by "Can I afford it?" to say what a price
// costs in hours of work, e.g. a 45 ticket at 10 an hour is "4.5 hours of work".
import { hoursOfWork, money } from '@senbud/core';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadApp, loadProfile, type Profile, setHourlyRate } from '@/db';
import { Button, Card, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function RateSheet() {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState('');
  const [had, setHad] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });

  useEffect(() => {
    loadProfile(db).then((p) => p && setProfile(p));
    loadApp(db).then((a) => {
      setHad(!!a.hourlyRateCents);
      setAmount(a.hourlyRateCents ? String(a.hourlyRateCents / 100) : '');
    });
  }, [db]);

  const fmt = (cents: number) => money(cents / 100, profile.currency, profile.locale);
  const cents = toCents(amount);
  // The example uses their own rate once typed, so they see exactly what it does.
  const rate = cents > 0 ? cents : 1000;
  const price = 4500;

  async function save() {
    if (!(cents > 0)) return setError('Enter what you earn in one hour, like 10.');
    await setHourlyRate(db, cents);
    router.back();
  }

  async function remove() {
    await setHourlyRate(db, null);
    router.back();
  }

  return (
    <Screen>
      <T variant="title">How much do you earn an hour?</T>
      <T tone="textDim">From a part-time job, say. It’s optional, and it stays on this phone.</T>
      <Field
        label={`Pay per hour (${profile.currency})`}
        value={amount}
        onChangeText={(v) => (setAmount(v.replace(/[^\d.,]/g, '')), setError(''))}
        keyboardType="decimal-pad"
        placeholder="10"
        error={error}
        autoFocus
      />
      <Card>
        <T variant="label" tone="textDim">
          What it does
        </T>
        <T>
          In Can I afford it?, a {fmt(price)} ticket shows as “{hoursOfWork(price, rate)} hours of work” at {fmt(rate)} an hour.
        </T>
      </Card>
      <Button title="Save" onPress={save} />
      {had && <Button title="Remove" variant="danger" onPress={remove} />}
    </Screen>
  );
}
