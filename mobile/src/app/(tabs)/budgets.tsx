// Budgets (design system 4.3): what's left on the cobalt hero, spending by category with a bar
// each, rent and bills, and subscriptions Senbud has spotted (Pro).
import { billCountdown, billsDue, budgetStatus, type Category, detectSubscriptions, spentIn, type Subscription } from '@senbud/core';
import { categoryColors, space } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { deleteBill, listTransactions, loadLimits, saveSubscription, type Txn } from '@/db';
import { useMoney } from '@/money';
import { usePro } from '@/purchases';
import { Button, CATEGORIES, Card, Icon, ListGroup, ListRow, MONO, ProLock, Progress, Row, Screen, T, TextButton, useTheme } from '@/ui';

export default function Budgets() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m, reload } = useMoney();
  const pro = usePro();
  const [limits, setLimits] = useState<Partial<Record<Category, number>>>({});
  const [history, setHistory] = useState<Txn[]>([]);

  const load = useCallback(() => {
    loadLimits(db).then(setLimits);
    listTransactions(db).then(setHistory);
  }, [db]);
  useFocusEffect(load);

  if (!m) return null;
  const { setup, txns, bills, subscriptions, safe, status, fmt, day } = m;
  const limit = setup.budget.cents;
  const left = limit - safe.spent;
  const { locale } = setup.profile;
  const periodName =
    setup.budget.period.kind === 'month'
      ? `${new Date(`${safe.start}T12:00:00Z`).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })} · monthly`
      : 'This week · weekly';
  const statusWords = status === 'over' ? 'Over, no stress' : status === 'close' ? 'Close' : 'On track';

  const rows = CATEGORIES.map((category) => {
    const spent = spentIn(txns.filter((x) => x.category === category), safe);
    return { category, spent, limit: limits[category] };
  }).filter((r) => r.limit || r.spent);
  const hasLimits = rows.some((r) => r.limit);

  const known = new Set(subscriptions.map((s) => s.merchant.toLowerCase()));
  const spotted = detectSubscriptions(history).filter((s) => !known.has(s.merchant.toLowerCase()));
  const setAside = billsDue(bills, day, safe.nextStart);
  // Wrapped: this month so far, then up to five earlier months that have spending.
  const thisMonth = day.slice(0, 7);
  const months = [thisMonth, ...new Set(history.map((x) => x.date.slice(0, 7)).filter((mo) => mo < thisMonth))].slice(0, 6);
  const monthName = (mo: string) => new Date(`${mo}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  async function answer(s: Subscription, yes: boolean) {
    await saveSubscription(db, { ...s, confirmed: yes });
    reload();
  }

  return (
    <Screen>
      <Card tone="panel">
        <T variant="label" tone="onPanelDim">
          {periodName}
        </T>
        <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {fmt(Math.max(0, left))}
        </T>
        <Progress value={safe.spent / limit} status={status} tone="panel" />
        <T variant="caption" tone="onPanelDim">
          {fmt(safe.spent)} of {fmt(limit)} spent. {statusWords}, {safe.daysLeft} {safe.daysLeft === 1 ? 'day' : 'days'} to go.
        </T>
      </Card>

      {rows.length ? (
        <View style={{ gap: space.sm }}>
          <T variant="label" tone="textDim">
            {periodName.split(' · ')[0]} · by category
          </T>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {rows.map((r, i) => (
              <CategoryRow key={r.category} {...r} first={i === 0} fmt={fmt} onPress={() => router.push({ pathname: '/limit', params: { category: r.category } })} />
            ))}
            {hasLimits && <TextButton title="Set a category limit" onPress={() => router.push('/limit')} />}
          </Card>
        </View>
      ) : null}
      {!hasLimits && (
        <Card>
          <T>Give a category its own limit, like Food at {fmt(40000)} a month.</T>
          <Button title="Add a category limit" variant="secondary" onPress={() => router.push('/limit')} />
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <T variant="label" tone="textDim">
          Rent and bills
        </T>
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {bills.map((b, i) => {
            const { days } = billCountdown(b, day);
            return (
              <Row key={b.id} style={{ minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: t.line, flexWrap: 'nowrap' }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{b.name}</T>
                  <T variant="caption" tone="textDim">
                    Day {b.dueDay} · {days === 0 ? 'due today' : `in ${days} ${days === 1 ? 'day' : 'days'}`}
                  </T>
                </View>
                <T variant="bodyStrong" money>
                  {fmt(b.cents)}
                </T>
                {b.name === 'Rent' ? (
                  <TextButton title="Edit" onPress={() => router.push('/edit-rent')} />
                ) : (
                  <Pressable
                    onPress={async () => {
                      await deleteBill(db, b.id);
                      reload();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${b.name}`}
                    hitSlop={14}
                    style={{ padding: space.xs }}
                  >
                    <Icon name={{ ios: 'trash', android: 'delete' }} size={20} color={t.bad} />
                  </Pressable>
                )}
              </Row>
            );
          })}
          <TextButton title="Add a bill" onPress={() => router.push('/bill')} />
        </Card>
        {setAside > 0 && (
          <T variant="caption" tone="textDim">
            {fmt(setAside)} is set aside and never counts as spendable.
          </T>
        )}
      </View>

      {spotted.slice(0, 1).map((s) => (
        <Card key={s.merchant}>
          <Row style={{ justifyContent: 'flex-start' }}>
            <T variant="label" tone="textDim">
              Spotted a subscription
            </T>
            {!pro && <ProLock onPress={() => router.push('/pro')} />}
          </Row>
          {pro ? (
            <>
              <T>
                {s.merchant} charged {fmt(s.cents)} every {s.interval}. Is it a subscription?
              </T>
              <Row style={{ justifyContent: 'flex-start' }}>
                <TextButton title="Not really" tone="textDim" onPress={() => answer(s, false)} />
                <TextButton title="Yes, track it" onPress={() => answer(s, true)} />
              </Row>
            </>
          ) : (
            <T tone="textDim">Senbud Pro spots repeat charges like {s.merchant} and reminds you before they renew.</T>
          )}
        </Card>
      ))}

      <View style={{ gap: space.sm }}>
        <T variant="label" tone="textDim">
          Budget
        </T>
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          <Pressable onPress={() => router.push('/edit-budget')} accessibilityRole="button" style={{ minHeight: 52, justifyContent: 'center' }}>
            <Row>
              <T>Period and amount</T>
              <T tone="textDim">
                {fmt(limit)} a {setup.budget.period.kind}
              </T>
            </Row>
          </Pressable>
          <Row style={{ minHeight: 52, borderTopWidth: 1, borderColor: t.line }}>
            <T>Until payday</T>
            <ProLock onPress={() => router.push('/pro')} />
          </Row>
        </Card>
      </View>

      <ListGroup title="Wrapped">
        {months.map((mo, i) => (
          <ListRow
            key={mo}
            first={i === 0}
            label={mo === thisMonth ? `${monthName(mo)} so far` : monthName(mo)}
            onPress={() => router.push({ pathname: '/wrapped', params: { month: mo } })}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}

// One category: name and what's left (or over) on top, a status bar, then "spent of limit" in words.
// Tapping it edits the limit. Colour is never the only signal: the words say left, close or over.
function CategoryRow({ category, spent, limit, first, fmt, onPress }: { category: Category; spent: number; limit?: number; first: boolean; fmt: (c: number) => string; onPress: () => void }) {
  const t = useTheme();
  const status = limit ? budgetStatus(spent, limit) : null;
  const left = limit ? limit - spent : 0;
  const right = !limit ? fmt(spent) : left < 0 ? `${fmt(-left)} over` : `${fmt(left)} left`;
  const sub = !limit ? 'No limit · tap to set one' : `${fmt(spent)} of ${fmt(limit)}${status === 'close' ? ' · go easy' : ''}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category}, ${right}, ${sub}`}
      style={({ pressed }) => ({ paddingVertical: space.sm, gap: space.xs, borderTopWidth: first ? 0 : 1, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: categoryColors[category].bg }} />
        <T variant="bodyStrong" style={{ flex: 1 }}>
          {category}
        </T>
        <T variant="bodyStrong" money tone={status === 'over' ? 'bad' : status === 'close' ? 'warn' : limit ? 'text' : 'textDim'}>
          {right}
        </T>
      </View>
      {limit ? <Progress value={spent / limit} status={status!} /> : null}
      <T variant="caption" tone="textDim">
        {sub}
      </T>
    </Pressable>
  );
}
