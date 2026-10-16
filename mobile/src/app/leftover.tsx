// Month-end leftover sheet (design system 4.6), opened by useLeftoverCheck when a budget period has
// ended under budget. The period is already marked handled, so closing the sheet keeps the money.
import { treatsInJar } from '@senbud/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { addToJar, listTreats, loadJar, today, type TreatRow } from '@/db';
import { useMoney } from '@/money';
import { Button, Screen, T } from '@/ui';

export default function LeftoverSheet() {
  const db = useSQLiteContext();
  const { money: m } = useMoney();
  const { start, cents: c } = useLocalSearchParams<{ start: string; cents: string }>();
  const cents = Number(c);
  const [jar, setJar] = useState<number | null>(null);
  const [cheapest, setCheapest] = useState<TreatRow | undefined>();

  useEffect(() => {
    Promise.all([loadJar(db), listTreats(db)]).then(([j, ts]) => {
      setJar(j.balanceCents);
      setCheapest([...ts].sort((a, b) => a.lastCents - b.lastCents)[0]);
    });
  }, [db]);

  if (!m || jar === null || !(cents > 0)) return null;
  const { fmt, setup } = m;
  const { period } = setup.budget;
  // "September" only when the budget runs with the calendar month; a payday-to-payday month is "Last month".
  const name =
    period.kind === 'week'
      ? 'Last week'
      : period.startDay === 1
        ? new Date(`${start}T12:00:00Z`).toLocaleDateString(setup.profile.locale, { month: 'long', timeZone: 'UTC' })
        : 'Last month';
  const after = jar + cents;
  const buys = cheapest && treatsInJar(after, cheapest.lastCents);

  async function move() {
    await addToJar(db, cents, `${name} leftover`, today());
    router.back();
  }

  return (
    <Screen>
      <T variant="title" accessibilityRole="header">
        {name}’s done
      </T>
      <T>
        You finished{' '}
        <T variant="bodyStrong" money>
          {fmt(cents)}
        </T>{' '}
        under budget. Move it to the treat jar?
      </T>
      <T variant="caption" tone="textDim">
        The jar would have {fmt(after)}
        {buys ? `, about ${buys} × ${cheapest!.name}` : ''}.
      </T>
      <Button title={`Move ${fmt(cents)} to the jar`} onPress={move} />
      <Button title="Not now" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
