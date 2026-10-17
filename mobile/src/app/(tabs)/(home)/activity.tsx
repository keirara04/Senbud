import { addDays, money } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { deleteTransactions, listTransactions, loadSetup, type Profile, today, type Txn } from '@/db';
import { Card, CategoryChip, Icon, Row, T, useTheme } from '@/ui';

// "Today", "Yesterday", else a short local date ("Oct 14"). Dates are local calendar days, read at noon UTC
// so no time zone can shift them.
function dayLabel(date: string, locale: string) {
  const now = today();
  if (date === now) return 'Today';
  if (date === addDays(now, -1)) return 'Yesterday';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

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

  // Asks first: there's no Undo here, since a deleted row can't come back with its id.
  function remove(item: Txn) {
    Alert.alert(`Delete ${item.label}?`, 'It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransactions(db, [item.id]);
          load();
        },
      },
    ]);
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
            {/* flexBasis, not flex: 1, so at large text the amount wraps below instead of squeezing the label. */}
            <View style={{ flexGrow: 1, flexBasis: 180, gap: space.xs }}>
              <T variant="bodyStrong">{item.label}</T>
              <Row style={{ justifyContent: 'flex-start' }}>
                <CategoryChip category={item.category} />
                <T variant="caption" tone="textDim">
                  {dayLabel(item.date, profile.locale)}
                </T>
              </Row>
            </View>
            <T variant="bodyStrong" money>
              {money(item.cents / 100, profile.currency, profile.locale)}
            </T>
            <Pressable
              onPress={() => remove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.label}`}
              hitSlop={14}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: space.xs })}
            >
              <Icon name={{ ios: 'trash', android: 'delete' }} size={20} color={t.bad} />
            </Pressable>
          </Row>
        </Card>
      )}
    />
  );
}
