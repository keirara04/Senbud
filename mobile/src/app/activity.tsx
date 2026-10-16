import { money } from '@senbud/core';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { deleteTransactions, listTransactions, loadSetup, type Profile, type Txn } from '@/db';
import { c, ui } from '@/ui';

export default function Activity() {
  const db = useSQLiteContext();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });

  const load = useCallback(async () => {
    const s = await loadSetup(db);
    if (s) setProfile(s.profile);
    setTxns(await listTransactions(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function remove(id: number) {
    await deleteTransactions(db, [id]);
    load();
  }

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={ui.page}
      data={txns}
      keyExtractor={(t) => String(t.id)}
      ListEmptyComponent={<Text style={ui.dim}>Nothing yet. Type “lunch 12” on Home to add your first expense.</Text>}
      renderItem={({ item }) => (
        <View style={[ui.card, ui.row]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.text}>{item.label}</Text>
            <Text style={ui.dim}>
              {item.category} · {item.date}
            </Text>
          </View>
          <Text style={[ui.text, { fontVariant: ['tabular-nums'] }]}>{money(item.cents / 100, profile.currency, profile.locale)}</Text>
          <Pressable onPress={() => remove(item.id)} accessibilityRole="button" accessibilityLabel={`Delete ${item.label}`} hitSlop={12}>
            <Text style={{ color: c.coral, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
