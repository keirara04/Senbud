// Set or remove a category's limit (Budgets → StampLedger row). Category limits are free; giving one its
// own period ("Food weekly" inside a monthly budget) is Pro.
import type { Category } from '@senbud/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { typed, useCurrency } from '@/currencies';
import { type LimitPeriod, loadLimitPeriod, loadLimits, setLimit } from '@/db';
import { usePro } from '@/purchases';
import { Button, CATEGORIES, CategoryPicker, Field, Screen, Segmented, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function LimitSheet() {
  const db = useSQLiteContext();
  const currency = useCurrency();
  const params = useLocalSearchParams<{ category?: Category; amount?: string }>();
  const [category, setCategory] = useState<Category>(params.category && CATEGORIES.includes(params.category) ? params.category : 'Food');
  const [amount, setAmount] = useState('');
  const [had, setHad] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<LimitPeriod>(null);
  const pro = usePro();

  useEffect(() => {
    loadLimitPeriod(db, category).then(setPeriod);
    loadLimits(db).then((l) => {
      setHad(!!l[category]);
      // Bud can open this prefilled with a suggested amount for the category it named.
      setAmount(params.amount && category === params.category ? params.amount : l[category] ? String(l[category]! / 100) : '');
    });
  }, [db, category, params.amount, params.category]);

  async function save() {
    const cents = toCents(amount);
    if (!(cents > 0)) return setError('Enter a limit, like 400.');
    await setLimit(db, category, cents, period);
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
      <T variant="label" tone="textDim">
        Resets
      </T>
      <Segmented
        options={[
          { value: 'budget', label: 'With budget' },
          { value: 'week', label: 'Weekly' },
          { value: 'month', label: 'Monthly' },
        ]}
        value={period ?? 'budget'}
        onChange={(v) => (v !== 'budget' && !pro ? router.push('/pro') : setPeriod(v === 'budget' ? null : v))}
      />
      <Field label={period ? `Limit each ${period}` : 'Limit for this period'} value={amount} onChangeText={(v) => (setAmount(v), setError(''))} keyboardType="decimal-pad" placeholder={typed(400, currency)} error={error} autoFocus />
      <Button title="Save" onPress={save} />
      {had && <Button title="Remove limit" variant="danger" onPress={remove} />}
    </Screen>
  );
}
