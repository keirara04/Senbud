// Pick a currency from a list instead of typing a code (Settings → Currency, and Setup on first run).
import { money } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { CURRENCIES, currencyName } from '@/currencies';
import { loadProfile, setCurrency } from '@/db';
import { Card, Field, Icon, Screen, T, useTheme } from '@/ui';

export default function CurrencySheet() {
  const db = useSQLiteContext();
  const t = useTheme();
  const device = getLocales()[0];
  const [current, setCurrent] = useState(device.currencyCode ?? 'USD');
  const [hasData, setHasData] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    loadProfile(db).then((p) => {
      if (!p) return;
      setCurrent(p.currency);
      setHasData(true);
    });
  }, [db]);

  const query = q.trim().toLowerCase();
  const list = CURRENCIES.filter(([code, name]) => !query || code.toLowerCase().includes(query) || name.toLowerCase().includes(query));

  async function pick(code: string) {
    if (!hasData || code === current) {
      await setCurrency(db, code, device.languageTag);
      return router.back();
    }
    // Amounts are stored as plain numbers, so a switch relabels them (US$1,000 becomes ₩1,000). Say so
    // before it happens, and go straight to the budget so the main number makes sense again.
    const example = (c: string) => money(1000, c, device.languageTag).replace(/[.,]00$/, '');
    Alert.alert(`Switch to ${currencyName(code)}?`, `Saved amounts keep their numbers, so ${example(current)} becomes ${example(code)}. Set your budget again next.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          await setCurrency(db, code, device.languageTag);
          router.replace('/edit-budget');
        },
      },
    ]);
  }

  return (
    <Screen>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Ringgit, SGD…" autoCorrect={false} autoCapitalize="none" />
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {list.map(([code, name], i) => (
          <Pressable
            key={code}
            onPress={() => pick(code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: code === current }}
            accessibilityLabel={`${name}, ${code}`}
            style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: i ? 1 : 0, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{name}</T>
              <T variant="caption" tone="textDim">
                {code} · {money(12.5, code, device.languageTag)}
              </T>
            </View>
            {code === current ? <Icon name={{ ios: 'checkmark', android: 'check' }} size={20} color={t.accent} /> : null}
          </Pressable>
        ))}
        {!list.length && (
          <T tone="textDim" style={{ paddingVertical: space.sm }}>
            No currency matches “{q}”.
          </T>
        )}
      </Card>
      {hasData && (
        <T variant="caption" tone="textDim">
          Changing it relabels what you’ve saved; amounts aren’t converted.
        </T>
      )}
    </Screen>
  );
}
