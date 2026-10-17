// Add a treat: what it is, what it costs, and how often it feels fine (spec 4.8 treat nudges).
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { treatExample, typed, useCurrency } from '@/currencies';
import { addTreat } from '@/db';
import { Button, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function TreatSheet() {
  const db = useSQLiteContext();
  const currency = useCurrency();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [every, setEvery] = useState('7');
  const [errors, setErrors] = useState<{ name?: string; price?: string; every?: string }>({});

  async function save() {
    const cents = toCents(price);
    const days = Number(every);
    const e: typeof errors = {};
    if (!name.trim()) e.name = `Name it, like “${treatExample(currency)}”.`;
    if (!(cents > 0)) e.price = 'What does it usually cost?';
    if (!(Number.isInteger(days) && days >= 1 && days <= 365)) e.every = 'A number of days, like 7.';
    setErrors(e);
    if (Object.keys(e).length) return;
    await addTreat(db, { name: name.trim(), lastCents: cents, minDaysBetween: days });
    router.back();
  }

  return (
    <Screen>
      <T variant="title">Add a treat</T>
      <Field label="Treat" value={name} onChangeText={setName} placeholder={treatExample(currency)} error={errors.name} autoFocus />
      <Field label="Usual price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder={typed(9.9, currency)} error={errors.price} />
      <Field label="Fine every how many days?" value={every} onChangeText={setEvery} keyboardType="number-pad" error={errors.every} />
      <Button title="Add treat" onPress={save} />
    </Screen>
  );
}
