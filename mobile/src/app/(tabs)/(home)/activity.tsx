import { addDays, type Category, money } from '@senbud/core';
import { radius, space } from '@senbud/core/tokens';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';

import { mealExample } from '@/currencies';
import { deleteTransactions, listTransactions, loadSetup, type Profile, restoreTransactions, today, type Txn } from '@/db';
import { CATEGORIES, Card, CategoryChip, Icon, noWebOutline, Row, T, UndoBar, useTheme, useUndo } from '@/ui';

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
  const removed = useUndo<Txn>();
  const [query, setQuery] = useState('');
  // A category, or 'bud' for what Bud added. Bud's mark shows only while that chip is on.
  const [only, setOnly] = useState<Category | 'bud' | null>(null);

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

  // Deletes straight away with Undo, like a quick add on Home: the row comes back with its own id.
  async function remove(item: Txn) {
    await deleteTransactions(db, [item.id]);
    removed.offer(item);
    load();
  }

  async function undoRemove() {
    const item = removed.take();
    if (item) await restoreTransactions(db, [item]);
    load();
  }

  // Filters: a search over labels and one chip at a time. Chips only for what's there.
  const q = query.trim().toLowerCase();
  const shown = txns.filter((x) => (!only || (only === 'bud' ? x.source === 'bud' : x.category === only)) && (!q || x.label.toLowerCase().includes(q)));
  const used = CATEGORIES.filter((c) => txns.some((x) => x.category === c));
  const byBud = txns.some((x) => x.source === 'bud');
  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: space.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? t.text : t.line, backgroundColor: on ? t.text : t.surface }}
    >
      <T variant="caption" style={{ fontWeight: '600', color: on ? t.bg : t.text }}>
        {label}
      </T>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
        data={shown}
        keyExtractor={(x) => String(x.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          txns.length ? (
            <View style={{ gap: space.sm }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={t.placeholder}
                selectionColor={t.accent}
                accessibilityLabel="Search expenses"
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={[{ minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, color: t.text }, noWebOutline]}
              />
              {(used.length > 1 || byBud) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" contentContainerStyle={{ gap: space.xs }}>
                  {chip('All', !only, () => setOnly(null))}
                  {used.map((c) => chip(c, only === c, () => setOnly(only === c ? null : c)))}
                  {byBud && chip('Added by Bud', only === 'bud', () => setOnly(only === 'bud' ? null : 'bud'))}
                </ScrollView>
              )}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <T tone="textDim" style={{ textAlign: 'center', marginTop: space.xl }}>
            {txns.length ? 'Nothing matches.' : `Nothing yet. Type “${mealExample(profile.currency)}” on Home to add your first expense.`}
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
                    {only === 'bud' ? ' · Added by Bud' : ''}
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
      {removed.item && (
        <View style={{ position: 'absolute', left: space.md, right: space.md, bottom: space.md }}>
          <UndoBar message={`Deleted ${removed.item.label}, ${money(removed.item.cents / 100, profile.currency, profile.locale)}`} onUndo={undoRemove} />
        </View>
      )}
    </View>
  );
}
