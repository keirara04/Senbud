import {
  aheadOfPace,
  billCountdown,
  budgetStatus,
  money,
  parseSpending,
  periodRange,
  safeToSpend,
  type Transaction,
} from '@senbud/core';
import { motion } from '@senbud/core/tokens';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { addTransactions, deleteTransactions, listTransactions, loadSetup, type Setup, today, type Txn } from '@/db';
import { Card, Field, Progress, Row, Screen, T, TextButton, UndoBar } from '@/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Home() {
  const db = useSQLiteContext();
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');
  const [undo, setUndo] = useState<{ ids: number[]; summary: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const s = await loadSetup(db);
    setSetup(s);
    if (s) setTxns(await listTransactions(db, periodRange(s.budget.period, today()).start));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  if (setup === undefined) return null;
  if (setup === null) return <Redirect href="/setup" />;

  const { currency, locale } = setup.profile;
  const fmt = (cents: number) => money(cents / 100, currency, locale);
  const day = today();
  const limit = setup.budget.cents;
  const unit = setup.budget.period.kind;
  const safe = safeToSpend({ limit, period: setup.budget.period, transactions: txns, bills: setup.rent ? [setup.rent] : [], today: day });
  const status = budgetStatus(safe.spent, limit);
  const rent = setup.rent && { ...setup.rent, ...billCountdown(setup.rent, day) };

  // Pace copy from spec 4.2: quiet while on track, a nudge when it isn't.
  const pace =
    status === 'over'
      ? `${fmt(safe.spent - limit)} over, no stress.`
      : status === 'close'
        ? `${fmt(limit - safe.spent)} left. Cook tonight?`
        : aheadOfPace(safe.spent, limit, safe, day)
          ? `${fmt(safe.spent)} of ${fmt(limit)} gone and it’s only ${WEEKDAYS[new Date().getDay()]}.`
          : 'On track.';

  async function add() {
    const items = parseSpending(text);
    if (!items.length) return setHint('Add an amount, like “lunch 12”.');
    const rows: Transaction[] = items.map((i) => ({
      date: day,
      cents: Math.round(i.amount * 100),
      label: i.label,
      category: i.category,
      source: 'text',
    }));
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
    <Screen>
      <Card tone="panel">
        <T variant="label" tone="onPanelDim">
          Safe to spend today
        </T>
        <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {fmt(safe.perDay)}
        </T>
        <T variant="caption" tone="onPanelDim">
          {fmt(Math.max(0, safe.left))} left for {safe.daysLeft} {safe.daysLeft === 1 ? 'day' : 'days'}
        </T>
      </Card>

      {rent && (
        <Card>
          <T>
            Rent {fmt(rent.cents)} {rent.days === 0 ? 'is due today' : `in ${rent.days} ${rent.days === 1 ? 'day' : 'days'}`}
            {safe.covered ? ' — you’re covered.' : ' — not covered yet.'}
          </T>
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
        <T variant="caption" tone={status === 'over' ? 'bad' : status === 'close' ? 'warn' : 'textDim'}>
          {pace}
        </T>
      </Card>

      <Card>
        <Field
          label="What did you spend?"
          value={text}
          onChangeText={(v) => {
            setText(v);
            setHint('');
          }}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder="lunch 12, uber 8"
          error={hint}
        />
        {undo && <UndoBar message={undo.summary} onUndo={undoAdd} />}
        <TextButton title="Snap a receipt instead" onPress={() => router.push('/receipt')} />
      </Card>

      <Row style={{ justifyContent: 'space-around' }}>
        <TextButton title="Activity" onPress={() => router.push('/activity')} />
        <TextButton title="Budget & rent" onPress={() => router.push('/setup')} />
      </Row>
    </Screen>
  );
}
