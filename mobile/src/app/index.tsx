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
import { Link, Redirect, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { addTransactions, deleteTransactions, listTransactions, loadSetup, type Setup, today, type Txn } from '@/db';
import { c, ui } from '@/ui';

const STATUS_COLOR = { ok: c.mint, close: '#f5c542', over: c.coral };

export default function Home() {
  const db = useSQLiteContext();
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [text, setText] = useState('');
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
  const safe = safeToSpend({
    limit: setup.budget.cents,
    period: setup.budget.period,
    transactions: txns,
    bills: setup.rent ? [setup.rent] : [],
    today: day,
  });
  const status = budgetStatus(safe.spent, setup.budget.cents);
  const fast = aheadOfPace(safe.spent, setup.budget.cents, safe, day);
  const rent = setup.rent && { ...setup.rent, ...billCountdown(setup.rent, day) };

  async function add() {
    const items = parseSpending(text);
    if (!items.length) return;
    const rows: Transaction[] = items.map((i) => ({
      date: day,
      cents: Math.round(i.amount * 100),
      label: i.label,
      category: i.category,
      source: 'text',
    }));
    const ids = await addTransactions(db, rows);
    setText('');
    clearTimeout(undoTimer.current);
    setUndo({ ids, summary: `Added ${rows.length} · ${fmt(rows.reduce((s, r) => s + r.cents, 0))}` });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <View style={[ui.card, { backgroundColor: c.panel }]}>
        <Text style={[ui.label, { color: c.onPanelDim }]}>Safe to spend today</Text>
        <Text style={{ color: c.hl, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] }} accessibilityRole="header">
          {fmt(safe.perDay)}
        </Text>
        <Text style={{ color: c.onPanelDim, fontSize: 15 }}>
          {fmt(Math.max(0, safe.left))} left for {safe.daysLeft} {safe.daysLeft === 1 ? 'day' : 'days'}
        </Text>
      </View>

      {rent && (
        <View style={ui.card}>
          <Text style={ui.text}>
            🏠 Rent {fmt(rent.cents)} {rent.days === 0 ? 'due today' : `in ${rent.days} ${rent.days === 1 ? 'day' : 'days'}`}
            {safe.covered ? ' — you’re covered.' : ' — not covered yet.'}
          </Text>
        </View>
      )}

      <View style={ui.card}>
        <View style={ui.row}>
          <Text style={ui.text}>
            {fmt(safe.spent)} of {fmt(setup.budget.cents)} this {setup.budget.period.kind}
          </Text>
          <Text style={ui.dim}>{status === 'over' ? 'Over' : status === 'close' ? 'Close' : 'On track'}</Text>
        </View>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: '#e6e8f0', overflow: 'hidden' }}>
          <View
            style={{
              height: 10,
              width: `${Math.min(100, (safe.spent / setup.budget.cents) * 100)}%`,
              backgroundColor: STATUS_COLOR[status],
            }}
          />
        </View>
        {fast && status === 'ok' && <Text style={ui.dim}>Spending is running ahead of the {setup.budget.period.kind}.</Text>}
      </View>

      <View style={ui.card}>
        <Text style={ui.label}>Quick add</Text>
        <TextInput
          style={ui.input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder="lunch 12, uber 8"
          accessibilityLabel="Type what you spent"
        />
        {undo && (
          <View style={ui.row}>
            <Text style={ui.dim}>{undo.summary}</Text>
            <Pressable onPress={undoAdd} accessibilityRole="button" hitSlop={12}>
              <Text style={ui.link}>Undo</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[ui.row, { justifyContent: 'space-around' }]}>
        <Link href="/activity" style={ui.link}>
          Activity
        </Link>
        <Link href="/setup" style={ui.link}>
          Budget & rent
        </Link>
      </View>
    </ScrollView>
  );
}
