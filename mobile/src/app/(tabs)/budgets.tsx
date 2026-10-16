// Budgets (design system 4.3): what's left on the cobalt hero, the StampLedger by category on a
// receipt, rent and bills, and subscriptions Senbud has spotted (Pro).
import { billCountdown, billsDue, type Category, detectSubscriptions, spentIn, stamps, type Subscription } from '@senbud/core';
import { categoryColors, palette, space } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { ReceiptCard } from '@/art';
import { deleteBill, listTransactions, loadLimits, saveSubscription, type Txn } from '@/db';
import { useMoney } from '@/money';
import { usePro } from '@/purchases';
import { Button, CATEGORIES, Card, Icon, ProLock, Progress, Row, Screen, T, TextButton, useTheme } from '@/ui';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const RECEIPT_INK = palette.ink;
const RECEIPT_DIM = palette.inkDim;

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
        <ReceiptCard>
          <T variant="label" style={{ color: RECEIPT_DIM, fontFamily: MONO }}>
            {periodName.split(' · ')[0].toUpperCase()} · BY CATEGORY
          </T>
          {rows.map((r) => (
            <StampRow key={r.category} {...r} fmt={fmt} onPress={() => router.push({ pathname: '/limit', params: { category: r.category } })} />
          ))}
          {hasLimits && <TextButton title="Set a category limit" onPress={() => router.push('/limit')} color={palette.cobalt} />}
        </ReceiptCard>
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
                  <TextButton title="Edit" onPress={() => router.push('/setup')} />
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
          <Pressable onPress={() => router.push('/setup')} accessibilityRole="button" style={{ minHeight: 52, justifyContent: 'center' }}>
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
    </Screen>
  );
}

// One StampLedger row: name, dotted leader, "248 / 400", then 10 stamps and what's left in words.
function StampRow({ category, spent, limit, fmt, onPress }: { category: Category; spent: number; limit?: number; fmt: (c: number) => string; onPress: () => void }) {
  const st = stamps(spent, limit);
  const ink = categoryColors[category].fg;
  const major = (c: number) => fmt(c).replace(/[^\d.,\s]/g, '').trim();
  const words = !st
    ? 'No limit'
    : st.over
      ? `${major(-st.left)} over`
      : st.status === 'close'
        ? `${major(st.left)} left, go easy`
        : `${major(st.left)} left`;
  const wordColor = !st ? RECEIPT_DIM : st.over ? palette.coralInk : st.status === 'close' ? palette.amberInk : RECEIPT_DIM;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={limit ? `${category}, ${fmt(spent)} of ${fmt(limit)}, ${words}` : `${category}, ${fmt(spent)}, no limit. Set one.`}
      style={({ pressed }) => ({ minHeight: 48, gap: space.xs, paddingVertical: space.xs, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
        <T variant="bodyStrong" style={{ color: RECEIPT_INK }}>
          {category}
        </T>
        <T numberOfLines={1} style={{ flex: 1, color: RECEIPT_DIM, opacity: 0.5, fontFamily: MONO }}>
          {'. '.repeat(60)}
        </T>
        <T variant="caption" money style={{ color: RECEIPT_INK, fontFamily: MONO }}>
          {limit ? `${major(spent)} / ${major(limit)}` : major(spent)}
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        {st && (
          <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: 10 }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderStyle: i < st.filled ? 'solid' : 'dotted',
                  borderColor: i < st.filled ? ink : 'rgba(26, 28, 46, 0.35)',
                  backgroundColor: i < st.filled ? ink : 'transparent',
                }}
              />
            ))}
            {st.over && (
              <View style={{ width: 14, height: 14, borderRadius: 4, marginLeft: 5, borderWidth: 1.5, borderColor: palette.coralInk, backgroundColor: palette.coral }} />
            )}
          </View>
        )}
        <T variant="caption" style={{ color: wordColor }}>
          {words}
        </T>
      </View>
    </Pressable>
  );
}
