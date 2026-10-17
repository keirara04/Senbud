// Bud's notes (spec 5, core's nudges): what Bud says before you ask. Home shows one, the Bud screen up
// to three, with the same sentences. Everything here is worked out on the phone; nothing is sent.
import { addDays, detectSubscriptions, type Nudge, nudgeKey, nudges, underBudgetStreak } from '@senbud/core';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { dismissedToday, dismissNudge, listIous, listTransactions, listTreats, loadLimitPeriods, loadLimits } from '@/db';
import type { Money } from '@/money';
import { Card, Row, T, TextButton } from '@/ui';

// Notes not dismissed today, most important first. `dismiss` hides one note (and, from Home, Home's card)
// until tomorrow.
export function useBudNotes(m: Money | null | undefined) {
  const db = useSQLiteContext();
  const [state, setState] = useState<{ notes: Nudge[]; hidden: Set<string> } | null>(null);

  useEffect(() => {
    if (!m) return;
    const { day, setup, txns, safe, subscriptions, bills, onTrack } = m;
    // ponytail: 120 days catches weekly and monthly subscriptions, not yearly ones; widen if that matters.
    Promise.all([listIous(db), listTreats(db), loadLimits(db), listTransactions(db, addDays(day, -120)), dismissedToday(db, day), loadLimitPeriods(db)]).then(([ious, treats, limits, history, hidden, limitPeriods]) => {
      const known = new Set(subscriptions.map((s) => s.merchant.toLowerCase()));
      const notes = nudges({
        today: day,
        subscriptions,
        ious,
        treats,
        safe,
        onTrack,
        bills,
        limits,
        limitPeriods,
        // History, not this period's txns: a weekly limit's week can start before the budget's month.
        txns: history,
        range: safe,
        spotted: detectSubscriptions(history).filter((s) => !known.has(s.merchant.toLowerCase())),
        streak: underBudgetStreak(txns, setup.budget.cents, setup.budget.period, day, bills),
      });
      setState({ notes, hidden });
    });
  }, [db, m]);

  const dismiss = useCallback(
    async (keys: string[]) => {
      if (!m) return;
      await Promise.all(keys.map((k) => dismissNudge(db, k, m.day)));
      setState((s) => s && { ...s, hidden: new Set([...s.hidden, ...keys]) });
    },
    [db, m],
  );

  const visible = state ? state.notes.filter((n) => !state.hidden.has(nudgeKey(n))) : [];
  return { notes: visible, homeHidden: !!state?.hidden.has('home'), dismiss };
}

// One sentence and at most one action per note. No emoji (house style).
export function noteCopy(n: Nudge, fmt: (cents: number) => string, unit: string): { body: string; action?: [string, string] } {
  switch (n.kind) {
    case 'bill': {
      const when = n.days === 0 ? 'is due today' : n.days === 1 ? 'is due tomorrow' : `is due in ${n.days} days`;
      return { body: `${n.bill.name} ${fmt(n.bill.cents)} ${when}.${n.covered ? ' You’re covered.' : ' It isn’t covered yet.'}`, action: n.covered ? undefined : ['Plan for it', '/budgets'] };
    }
    case 'category':
      return n.status === 'over'
        ? { body: `${n.category} is ${fmt(n.spent - n.limit)} over its ${fmt(n.limit)} limit this ${unit}.`, action: ['See budgets', '/budgets'] }
        : { body: `${n.category} is going fast: ${fmt(n.spent)} of ${fmt(n.limit)} gone.`, action: ['See budgets', '/budgets'] };
    case 'renewal':
      return { body: `${n.subscription.merchant} renews tomorrow: ${fmt(n.subscription.cents)}.`, action: ['See budgets', '/budgets'] };
    case 'spotted':
      return { body: `${n.subscription.merchant} looks like a subscription, ${fmt(n.subscription.cents)} a ${n.subscription.interval}.`, action: ['Check it', '/budgets'] };
    case 'iou':
      return { body: `${n.iou.friend} still owes you ${fmt(n.iou.cents)} for ${n.iou.note}.`, action: ['Remind', '/friends'] };
    case 'streak':
      return { body: `${n.days} days in a row under budget. Nice.` };
    case 'treat':
      return { body: `${fmt(n.treat.lastCents)} for ${n.treat.name} fits today. Treat yourself?`, action: ['See treats', '/treats'] };
  }
}

export function NoteCard({ note, fmt, unit, onDismiss, label = 'Today' }: { note: Nudge; fmt: (c: number) => string; unit: string; onDismiss: () => void; label?: string }) {
  const { body, action } = noteCopy(note, fmt, unit);
  return (
    <Card>
      <T variant="label" tone="textDim">
        {label}
      </T>
      <T>{body}</T>
      <Row style={{ justifyContent: 'flex-start' }}>
        {action && <TextButton title={action[0]} onPress={() => router.push(action[1] as '/budgets')} />}
        <TextButton title="Not today" tone="textDim" onPress={onDismiss} />
      </Row>
    </Card>
  );
}
