// "Add by hand" sheet (spec 4.1): the amount pad first, then category, then an optional name.
import { type Category, money } from '@senbud/core';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { addTransactions, listTransactions, loadSetup, type Profile, today } from '@/db';
import { AmountPad, Button, CategoryPicker, digitsOf, Field, Row, Screen, T } from '@/ui';

export default function AddByHand() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [label, setLabel] = useState('');

  useEffect(() => {
    loadSetup(db).then((s) => s && setProfile(s.profile));
    // Last time's category, pre-selected (spec 4.1).
    listTransactions(db).then((txns) => txns[0] && setCategory(txns[0].category));
  }, [db]);

  const digits = digitsOf(profile.currency, profile.locale);
  const value = Number(amount || '0');
  const cents = Math.round(value * 100);

  async function save() {
    if (cents <= 0) return;
    await addTransactions(db, [{ date: today(), cents, label: label.trim() || category, category, source: 'manual' }]);
    router.back();
  }

  return (
    <Screen>
      <T variant="hero" money accessibilityRole="header" accessibilityLabel={`Amount ${money(value, profile.currency, profile.locale)}`} style={{ textAlign: 'center' }}>
        {money(value, profile.currency, profile.locale)}
      </T>

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
