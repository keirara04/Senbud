// "Add by hand" sheet (spec 4.1): the amount pad first, then category, then an optional name.
import { type Category, money } from '@senbud/core';
import { radius, space, touch } from '@senbud/core/tokens';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { addTransactions, listTransactions, loadSetup, type Profile, today } from '@/db';
import { Button, CategoryPicker, Field, Icon, Row, Screen, T, useTheme } from '@/ui';

// Minor digits of a currency, from Intl (0 for KRW/JPY, 2 for most).
const digitsOf = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

export default function AddByHand() {
  const db = useSQLiteContext();
  const t = useTheme();
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

  function press(key: string) {
    if (key === 'del') return setAmount((a) => a.slice(0, -1));
    setAmount((a) => {
      if (key === '.' && (a.includes('.') || digits === 0)) return a;
      const next = a === '0' && key !== '.' ? key : a + key;
      const [, dec = ''] = next.split('.');
      return dec.length > digits || next.replace('.', '').length > 7 ? a : next;
    });
  }

  async function save() {
    if (cents <= 0) return;
    await addTransactions(db, [{ date: today(), cents, label: label.trim() || category, category, source: 'manual' }]);
    router.back();
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', digits ? '.' : '', '0', 'del'];

  return (
    <Screen>
      <T variant="hero" money accessibilityRole="header" accessibilityLabel={`Amount ${money(value, profile.currency, profile.locale)}`} style={{ textAlign: 'center' }}>
        {money(value, profile.currency, profile.locale)}
      </T>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {keys.map((k, i) =>
          k ? (
            <Pressable
              key={k}
              onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
              style={({ pressed }) => ({
                flexBasis: '30%',
                flexGrow: 1,
                minHeight: touch.min + 8,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? t.surfaceSunken : t.surface,
              })}
            >
              {k === 'del' ? <Icon name={{ ios: 'delete.left', android: 'backspace' }} /> : <T variant="title">{k}</T>}
            </Pressable>
          ) : (
            <View key={`blank-${i}`} style={{ flexBasis: '30%', flexGrow: 1 }} />
          ),
        )}
      </View>

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
