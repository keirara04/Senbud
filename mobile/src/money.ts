// The money picture every screen shares: setup, this period's spending, bills, subscriptions and the
// safe-to-spend result. One computation, so Home, Afford, Budgets and Treats can never disagree.
import { aheadOfPace, budgetStatus, money, periodRange, safeToSpend, type Subscription } from '@senbud/core';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { type BillRow, listBills, listSubscriptions, listTransactions, loadSetup, type Setup, today, type Txn } from '@/db';

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
