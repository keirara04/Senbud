// Settings → Budget: the onboarding Budget step as a sheet, plus the period: a week, a month, or until
// payday (Pro). Rent and currency stay as they are.
import { dayOfMonth, periodRange, untilPeriod } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { loadSetup, type Setup, saveSetup, today } from '@/db';
import { budgetOf, BudgetStep, type Kind, ordinal, padValue, perPeriod, toCents } from '@/onboarding';
import { usePro } from '@/purchases';
import { DayStrip, Screen, Segmented, T } from '@/ui';

export default function EditBudget() {
  const db = useSQLiteContext();
  const pro = usePro();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [kind, setKind] = useState<Kind>('month');
  const [amount, setAmount] = useState('');
  const [payday, setPayday] = useState(25);

  useEffect(() => {
    loadSetup(db).then((s) => {
      if (!s) return;
      setSetup(s);
      setKind(s.budget.period.kind);
      setAmount(padValue(s.budget.cents));
      if (s.budget.period.kind === 'until') setPayday(dayOfMonth(periodRange(s.budget.period, today()).nextStart));
    });
  }, [db]);

  if (!setup) return null;
  const period = kind === 'until' ? untilPeriod(setup.budget.period, payday, today()) : null;
  return (
    <Screen>
      <Segmented
        options={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'until', label: 'Until payday' }, // Pro; free users get the paywall on tap (Budgets shows the lock)
        ]}
        value={kind}
        onChange={(k) => (k === 'until' && !pro ? router.push('/pro') : setKind(k))}
      />
      <BudgetStep
        kind={kind}
        amount={amount}
        onAmount={setAmount}
        profile={setup.profile}
        nextTitle="Save"
        onNext={async () => {
          const cents = toCents(amount);
          await saveSetup(db, { ...setup, budget: period ? { cents, period } : budgetOf(kind as 'week' | 'month', cents) });
          router.back();
        }}
      >
        {period && (
          <View style={{ gap: space.sm }}>
            <T variant="label" tone="textDim">
              Payday on the
            </T>
            <DayStrip value={payday} onChange={setPayday} ordinal={ordinal} />
            <T variant="caption" tone="textDim">
              Your budget runs {perPeriod(period, setup.profile.locale)}, then starts again for the same number of days until you set the next payday.
            </T>
          </View>
        )}
      </BudgetStep>
    </Screen>
  );
}
