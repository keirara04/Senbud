// Settings → Budget: the onboarding Budget step as a sheet. Rent and currency stay as they are.
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadSetup, type Setup, saveSetup } from '@/db';
import { budgetOf, BudgetStep, type Kind, padValue, toCents } from '@/onboarding';
import { Screen } from '@/ui';

export default function EditBudget() {
  const db = useSQLiteContext();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [kind, setKind] = useState<Kind>('month');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadSetup(db).then((s) => {
      if (!s) return;
      setSetup(s);
      setKind(s.budget.period.kind);
      setAmount(padValue(s.budget.cents));
    });
  }, [db]);

  if (!setup) return null;
  return (
    <Screen>
      <BudgetStep
        kind={kind}
        onKind={setKind}
        amount={amount}
        onAmount={setAmount}
        profile={setup.profile}
        nextTitle="Save"
        onNext={async () => {
          await saveSetup(db, { ...setup, budget: budgetOf(kind, toCents(amount)) });
          router.back();
        }}
      />
    </Screen>
  );
}
