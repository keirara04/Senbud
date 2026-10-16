// Set or remove a category's limit (Budgets → StampLedger row). Category limits are free.
import type { Category } from '@senbud/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadLimits, setLimit } from '@/db';
import { Button, CATEGORIES, CategoryPicker, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function LimitSheet() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ category?: Category }>();
  const [category, setCategory] = useState<Category>(params.category && CATEGORIES.includes(params.category) ? params.category : 'Food');
  const [amount, setAmount] = useState('');
  const [had, setHad] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLimits(db).then((l) => {
      setHad(!!l[category]);
      setAmount(l[category] ? String(l[category]! / 100) : '');
    });
  }, [db, category]);

  async function save() {
    const cents = toCents(amount);
    if (!(cents > 0)) return setError('Enter a limit, like 400.');
    await setLimit(db, category, cents);
    router.back();
  }

  async function remove() {
    await setLimit(db, category, null);
    router.back();
  }

  return (
    <Screen>
      <T variant="title">{category} limit</T>
      {!params.category && <CategoryPicker value={category} onChange={setCategory} />}
      <Field label="Limit for this period" value={amount} onChangeText={(v) => (setAmount(v), setError(''))} keyboardType="decimal-pad" placeholder="400" error={error} autoFocus />
      <Button title="Save" onPress={save} />
      {had && <Button title="Remove limit" variant="danger" onPress={remove} />}
    </Screen>
  );
}
