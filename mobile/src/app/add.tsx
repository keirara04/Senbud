// "Add by hand" sheet (spec 4.1): the amount pad first, then category, then an optional name.
import { type Category, money } from '@senbud/core';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { addTransactions, listTransactions, loadSetup, type Profile, today, type Txn } from '@/db';
import { AmountPad, Button, CategoryPicker, digitsOf, Field, Row, Screen, T, TextButton } from '@/ui';

export default function AddByHand() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [label, setLabel] = useState('');
  const [last, setLast] = useState<Txn | null>(null);

  useEffect(() => {
    loadSetup(db).then((s) => s && setProfile(s.profile));
    // Last time's category, pre-selected, and a one-tap repeat of the last expense (spec 4.1).
    listTransactions(db).then(([x]) => {
      if (!x) return;
      setCategory(x.category);
      setLast(x);
    });
  }, [db]);

  const digits = digitsOf(profile.currency, profile.locale);
  const value = Number(amount || '0');
  const cents = Math.round(value * 100);

  async function save() {
    if (cents <= 0) return;
    await addTransactions(db, [{ date: today(), cents, label: label.trim() || category, category, source: 'manual' }]);
    router.back();
  }

  async function repeat(x: Txn) {
    await addTransactions(db, [{ date: today(), cents: x.cents, label: x.label, category: x.category, source: 'manual' }]);
    router.back();
  }

  return (
    <Screen>
      <T variant="hero" money accessibilityRole="header" accessibilityLabel={`Amount ${money(value, profile.currency, profile.locale)}`} style={{ textAlign: 'center' }}>
        {money(value, profile.currency, profile.locale)}
      </T>

      {last && !amount && <TextButton title={`Repeat: ${last.label} ${money(last.cents / 100, profile.currency, profile.locale)}`} onPress={() => repeat(last)} />}

      <AmountPad value={amount} onChange={setAmount} digits={digits} />

      <CategoryPicker value={category} onChange={setCategory} />

      <Field label="What was it? (optional)" value={label} onChangeText={setLabel} placeholder={category} returnKeyType="done" />
      <Row>
        <T variant="caption" tone="textDim">
          Today
        </T>
      </Row>
      <Button title={cents > 0 ? `Add ${money(value, profile.currency, profile.locale)}` : 'Type an amount'} disabled={cents <= 0} onPress={save} />
    </Screen>
  );
}
