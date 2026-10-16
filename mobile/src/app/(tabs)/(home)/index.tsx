import {
  aheadOfPace,
  billCountdown,
  budgetStatus,
  money,
  type Nudge,
  parseSpending,
  periodRange,
  pickNudge,
  safeToSpend,
  type Transaction,
} from '@senbud/core';
import { motion, radius, space } from '@senbud/core/tokens';
import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import {
  addTransactions,
  type BillRow,
  deleteTransactions,
  listBills,
  listIous,
  listSubscriptions,
  listTransactions,
  listTreats,
  loadSetup,
  type Setup,
  today,
  type Txn,
} from '@/db';
import { Button, Card, Icon, Progress, Row, T, TextButton, UndoBar, useTheme } from '@/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Words that start a question rather than a list of spending ("can I afford…", "how's my month?").
const QUESTION = /\?\s*$|^(can|could|should|how|what|why|when|is|am|do|does|will)\b/i;

type Data = { setup: Setup; txns: Txn[]; bills: BillRow[]; nudge: Nudge | null };

export default function Home() {
  const db = useSQLiteContext();
  const t = useTheme();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');
  const [undo, setUndo] = useState<{ ids: number[]; summary: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const setup = await loadSetup(db);
    if (!setup) return setData(null);
    const day = today();
    const [txns, bills, subscriptions, ious, treats] = await Promise.all([
      listTransactions(db, periodRange(setup.budget.period, day).start),
      listBills(db),
      listSubscriptions(db),
      listIous(db),
      listTreats(db),
    ]);
    const safe = safeToSpend({ limit: setup.budget.cents, period: setup.budget.period, transactions: txns, bills, subscriptions, today: day });
    const onTrack = budgetStatus(safe.spent, setup.budget.cents) === 'ok' && !aheadOfPace(safe.spent, setup.budget.cents, safe, day);
    setData({ setup, txns, bills, nudge: pickNudge({ today: day, subscriptions, ious, treats, safe, onTrack }) });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  if (data === undefined) return null;
  if (data === null) return <Redirect href="/setup" />;

  const { setup, txns, bills, nudge } = data;
  const { currency, locale } = setup.profile;
  const fmt = (cents: number) => money(cents / 100, currency, locale);
  const day = today();
  const limit = setup.budget.cents;
  const unit = setup.budget.period.kind;
  const safe = safeToSpend({ limit, period: setup.budget.period, transactions: txns, bills, today: day });
  const status = budgetStatus(safe.spent, limit);
  const rent = setup.rent && { ...setup.rent, ...billCountdown(setup.rent, day) };
  const now = new Date();
  const dateLabel = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });

  // Pace copy from spec 4.2; the pace nudge (priority 2) lives in this card, not a separate one.
  const pace =
    status === 'over'
      ? `${fmt(safe.spent - limit)} over, no stress.`
      : status === 'close'
        ? `${fmt(limit - safe.spent)} left. Cook tonight?`
        : aheadOfPace(safe.spent, limit, safe, day)
          ? `${fmt(safe.spent)} of ${fmt(limit)} gone and it’s only ${WEEKDAYS[now.getDay()]}.`
          : 'On track.';

  async function submit() {
    const line = text.trim();
    if (!line) return;
    const items = parseSpending(line);
    if (!items.length) {
      if (QUESTION.test(line)) {
        setText('');
        return router.push({ pathname: '/assistant', params: { q: line } });
      }
      return setHint('Add an amount, like “nasi lemak 6.50”.');
    }
    const rows: Transaction[] = items.map((i) => ({ date: day, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'text' }));
    const ids = await addTransactions(db, rows);
    setText('');
    setHint('');
    clearTimeout(undoTimer.current);
    const total = fmt(rows.reduce((s, r) => s + r.cents, 0));
    setUndo({ ids, summary: rows.length === 1 ? `Added ${rows[0].label}, ${total}` : `Added ${rows.length} items, ${total}` });
    undoTimer.current = setTimeout(() => setUndo(null), motion.undoMs);
    load();
  }

  async function undoAdd() {
    if (!undo) return;
    clearTimeout(undoTimer.current);
    await deleteTransactions(db, undo.ids);
    setUndo(null);
    load();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => (
            <T variant="bodyStrong" tone="textDim">
              {dateLabel}
            </T>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={12} style={{ padding: space.xs }}>
              <Icon name={{ ios: 'gearshape', android: 'settings' }} color={t.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
        <Card tone="panel">
          <T variant="label" tone="onPanelDim">
            Safe to spend today
          </T>
          <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            {fmt(safe.covered ? safe.perDay : 0)}
          </T>
          <T variant="caption" tone="onPanelDim">
            {safe.covered
              ? `${fmt(Math.max(0, safe.left))} left for ${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'}, after rent and bills`
              : 'Rent comes first. This goes back up once it’s covered.'}
          </T>
        </Card>

        {rent && (
          <Card>
            <T>
              Rent {fmt(rent.cents)} {rent.days === 0 ? 'is due today' : `in ${rent.days} ${rent.days === 1 ? 'day' : 'days'}`}
              {safe.covered ? ' — you’re covered.' : ` — ${fmt(-safe.left)} short.`}
            </T>
            {!safe.covered && (
              <>
                <T variant="caption" tone="textDim">
                  No stress. Hold off on treats and Senbud will plan the next {rent.days || 1} days around rent.
                </T>
                <Button title="Plan for rent" variant="secondary" onPress={() => router.push('/budgets')} />
              </>
            )}
          </Card>
        )}

        <Card>
          <Row>
            <T variant="bodyStrong" money>
              {fmt(safe.spent)} of {fmt(limit)}
            </T>
            <T variant="caption" tone="textDim">
              this {unit}
            </T>
          </Row>
          <Progress value={safe.spent / limit} status={status} />
          <Row>
            <T variant="caption" tone={status === 'over' ? 'bad' : status === 'close' ? 'warn' : 'textDim'} style={{ flexShrink: 1 }}>
              {pace}
            </T>
            <TextButton title="See activity" onPress={() => router.push('/activity')} />
          </Row>
        </Card>

        {nudge && <NudgeCard nudge={nudge} fmt={fmt} />}

        {!txns.length && <T tone="textDim">Type what you spent below, like “nasi lemak 6.50”. Senbud does the rest.</T>}
        <TextButton title="Can I afford it?" onPress={() => router.push('/afford')} />
      </ScrollView>

      <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm }}>
        {undo && <UndoBar message={undo.summary} onUndo={undoAdd} />}
        {hint ? (
          <T variant="caption" tone="bad">
            {hint}
          </T>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            backgroundColor: t.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: t.line,
            paddingHorizontal: space.xs,
          }}
        >
          <Pressable onPress={() => router.push('/receipt')} accessibilityRole="button" accessibilityLabel="Snap a receipt" style={{ padding: space.sm }} hitSlop={4}>
            <Icon name={{ ios: 'camera', android: 'photo_camera' }} color={t.accent} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              setHint('');
            }}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="kopi 4.50, grab 12"
            placeholderTextColor={t.textDim}
            selectionColor={t.accent}
            accessibilityLabel="Type what you spent, or ask Bud"
            style={{ flex: 1, minHeight: 48, fontSize: 17, color: t.text }}
          />
          <Pressable onPress={() => router.push('/add')} accessibilityRole="button" accessibilityLabel="Add by hand" style={{ padding: space.sm }} hitSlop={4}>
            <Icon name={{ ios: 'pencil', android: 'edit' }} color={t.accent} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Today's nudge, priorities 3–5 of spec 5. One sentence, at most two actions.
function NudgeCard({ nudge, fmt }: { nudge: Nudge; fmt: (c: number) => string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const body =
    nudge.kind === 'renewal'
      ? `${nudge.subscription.merchant} renews tomorrow: ${fmt(nudge.subscription.cents)}.`
      : nudge.kind === 'iou'
        ? `${nudge.iou.friend} still owes you ${fmt(nudge.iou.cents)} for ${nudge.iou.note}.`
        : `${fmt(nudge.treat.lastCents)} for ${nudge.treat.name} fits today. Treat yourself?`;
  const action =
    nudge.kind === 'iou' ? ['Remind', '/friends'] : nudge.kind === 'treat' ? ['See treats', '/treats'] : ['See budgets', '/budgets'];
  return (
    <Card>
      <T variant="label" tone="textDim">
        Today
      </T>
      <T>{body}</T>
      <Row style={{ justifyContent: 'flex-start' }}>
        <TextButton title={action[0]} onPress={() => router.push(action[1] as '/friends')} />
        <TextButton title="Not today" tone="textDim" onPress={() => setHidden(true)} />
      </Row>
    </Card>
  );
}
