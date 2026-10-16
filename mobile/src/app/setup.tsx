import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { eraseAll, loadSetup, saveSetup } from '@/db';
import { c, ui } from '@/ui';

// "12.50" or "12,50" -> 1250 cents; anything else -> NaN.
const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);
const fromCents = (n: number) => String(n / 100);

export default function SetupScreen() {
  const db = useSQLiteContext();
  const device = getLocales()[0];
  const [kind, setKind] = useState<'week' | 'month'>('week');
  const [limit, setLimit] = useState('');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [currency, setCurrency] = useState(device.currencyCode ?? 'USD');

  useEffect(() => {
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
    if (!(cents > 0)) return Alert.alert('How much can you spend?', `Enter your ${kind}ly budget.`);
    if (!(rentCents >= 0) || !(day >= 1 && day <= 31)) return Alert.alert('Check the rent', 'Amount and a due day from 1 to 31.');
    if (!/^[A-Za-z]{3}$/.test(currency)) return Alert.alert('Currency', 'Use a 3-letter code like USD or MYR.');
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
    Alert.alert('Erase all data?', 'Every expense, budget and bill on this phone is deleted. This cannot be undone.', [
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <Text style={ui.label}>Budget</Text>
      <View style={[ui.row, { justifyContent: 'flex-start' }]}>
        {(['week', 'month'] as const).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ selected: kind === k }}
            onPress={() => setKind(k)}
            style={[ui.input, kind === k && { backgroundColor: c.panel, borderColor: c.panel }]}
          >
            <Text style={[ui.text, kind === k && { color: c.onPanel }]}>Per {k}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={ui.input} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder={`Spend per ${kind}, e.g. 100`} accessibilityLabel="Budget amount" />

      <Text style={ui.label}>Rent (optional)</Text>
      <TextInput style={ui.input} value={rent} onChangeText={setRent} keyboardType="decimal-pad" placeholder="Monthly rent, e.g. 650" accessibilityLabel="Rent amount" />
      <TextInput style={ui.input} value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" placeholder="Due day of the month" accessibilityLabel="Rent due day" />

      <Text style={ui.label}>Currency</Text>
      <TextInput style={ui.input} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} accessibilityLabel="Currency code" />

      <Pressable style={ui.button} onPress={save} accessibilityRole="button">
        <Text style={ui.buttonText}>Save</Text>
      </Pressable>
      <Pressable onPress={erase} accessibilityRole="button" style={{ alignItems: 'center', padding: 12 }}>
        <Text style={[ui.text, { color: c.coral }]}>Erase all data</Text>
      </Pressable>
    </ScrollView>
  );
}
