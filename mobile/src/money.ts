// The money picture every screen shares: setup, this period's spending, bills, subscriptions and the
// safe-to-spend result. One computation, so Home, Afford, Budgets and Treats can never disagree.
import { aheadOfPace, budgetStatus, closedPeriod, hoursOfWork, money, monthRange, periodLeftover, periodRange, safeToSpend, type Subscription, wrapped } from '@senbud/core';
import { router, useFocusEffect } from 'expo-router';
import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type BillRow, listBills, listSubscriptions, listTransactions, loadApp, loadSetup, setPeriodHandled, type Setup, today, type Txn } from '@/db';
import { usePro } from '@/purchases';

export type Money = {
  setup: Setup;
  txns: Txn[];
  bills: BillRow[];
  subscriptions: Subscription[];
  safe: ReturnType<typeof safeToSpend>;
  status: ReturnType<typeof budgetStatus>;
  onTrack: boolean;
  day: string;
  fmt: (cents: number) => string;
};

/** Loads on focus. undefined while loading, null before Setup has run. `reload` after a write. */
export function useMoney() {
  const db = useSQLiteContext();
  const [state, setState] = useState<Money | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const setup = await loadSetup(db);
    if (!setup) return setState(null);
    const day = today();
    const [txns, bills, subscriptions] = await Promise.all([
      listTransactions(db, periodRange(setup.budget.period, day).start),
      listBills(db),
      listSubscriptions(db),
    ]);
    const limit = setup.budget.cents;
    const safe = safeToSpend({ limit, period: setup.budget.period, transactions: txns, bills, subscriptions, today: day });
    const status = budgetStatus(safe.spent, limit);
    const { currency, locale } = setup.profile;
    setState({
      setup,
      txns,
      bills,
      subscriptions,
      safe,
      status,
      onTrack: status === 'ok' && !aheadOfPace(safe.spent, limit, safe, day),
      day,
      fmt: (cents) => money(cents / 100, currency, locale),
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { money: state, reload };
}

// Month-end leftover (design system 4.6): when the app comes to the front and a budget period has
// ended since Senbud last looked, offer what was left for the treat jar. The period is marked handled
// before the sheet opens, so dismissing it counts as "keep it" and it never asks twice.
async function checkLeftover(db: SQLiteDatabase) {
  const setup = await loadSetup(db);
  if (!setup) return;
  const day = today();
  const { period } = setup.budget;
  const { periodHandled } = await loadApp(db);
  const current = periodRange(period, day).start;
  if (!periodHandled) return setPeriodHandled(db, current);
  const ended = closedPeriod(period, day, periodHandled);
  if (!ended) return;
  await setPeriodHandled(db, current);
  const [txns, bills] = await Promise.all([listTransactions(db, ended.start), listBills(db)]);
  const cents = periodLeftover(setup.budget.cents, txns, bills, ended);
  if (cents > 0) router.push({ pathname: '/leftover', params: { start: ended.start, cents: String(cents) } });
}

/** Mount once, in the tabs layout (the navigator is ready there). */
export function useLeftoverCheck() {
  const db = useSQLiteContext();
  useEffect(() => {
    let running = false; // a cold start can fire mount and 'active' together; ask once
    const check = () => {
      if (running) return;
      running = true;
      checkLeftover(db).catch(() => {}).finally(() => (running = false));
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [db]);
}

/** Wrapped for a calendar month ("2026-09"): the numbers, shared by the story and the share image. */
export function useWrapped(month: string) {
  const db = useSQLiteContext();
  const { money: m } = useMoney();
  const pro = usePro();
  const [data, setData] = useState<{ txns: Txn[]; rate: number | null } | null>(null);
  const range = monthRange(month);
  useEffect(() => {
    Promise.all([listTransactions(db, range.start), loadApp(db)]).then(([txns, a]) => setData({ txns, rate: a.hourlyRateCents }));
  }, [db, range.start]);
  if (!m || !data) return null;
  const { setup, bills, day, fmt } = m;
  const w = wrapped({ txns: data.txns, bills, limit: setup.budget.cents, period: setup.budget.period, month: range, today: day });
  const date = (o: Intl.DateTimeFormatOptions) => new Date(`${range.start}T12:00:00Z`).toLocaleDateString(setup.profile.locale, { ...o, timeZone: 'UTC' });
  // "4,296 hrs", "2.5 hrs": half hours only while they matter.
  const h = data.rate && w.spent ? hoursOfWork(w.spent, data.rate) : null;
  const hours = h === null ? null : new Intl.NumberFormat(setup.profile.locale, { maximumFractionDigits: h >= 10 ? 0 : 1 }).format(h);
  return { w, name: date({ month: 'long', year: 'numeric' }), month: date({ month: 'long' }), fmt, pro, hours, running: day < range.nextStart };
}
