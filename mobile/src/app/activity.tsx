import { money } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { deleteTransactions, listTransactions, loadSetup, type Profile, type Txn } from '@/db';
import { Card, CategoryChip, Row, T, useTheme } from '@/ui';

export default function Activity() {
  const db = useSQLiteContext();
  const t = useTheme();
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
      style={{ backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
      data={txns}
      keyExtractor={(x) => String(x.id)}
      ListEmptyComponent={
        <T tone="textDim" style={{ textAlign: 'center', marginTop: space.xl }}>
          Nothing yet. Type “lunch 12” on Home to add your first expense.
        </T>
      }
      renderItem={({ item }) => (
        <Card>
          <Row>
            <View style={{ flex: 1, gap: space.xs }}>
              <T variant="bodyStrong">{item.label}</T>
              <Row style={{ justifyContent: 'flex-start' }}>
                <CategoryChip category={item.category} />
                <T variant="caption" tone="textDim">
                  {item.date}
                </T>
              </Row>
            </View>
            <T variant="bodyStrong" money>
              {money(item.cents / 100, profile.currency, profile.locale)}
            </T>
            <Pressable
              onPress={() => remove(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.label}`}
              hitSlop={14}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: space.xs })}
            >
              <T variant="heading" tone="bad">
                ✕
              </T>
            </Pressable>
          </Row>
        </Card>
      )}
    />
  );
}
