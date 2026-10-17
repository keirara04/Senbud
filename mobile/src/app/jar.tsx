// Treat jar sheet: add money to the jar (mode=add) or set what it's filling toward (mode=goal).
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { typed, useCurrency } from '@/currencies';
import { addToJar, loadJar, setJarGoal, today } from '@/db';
import { Button, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function JarSheet() {
  const db = useSQLiteContext();
  const currency = useCurrency();
  const { mode } = useLocalSearchParams<{ mode?: 'add' | 'goal' }>();
  const goal = mode === 'goal';
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [hadGoal, setHadGoal] = useState(false);

  useEffect(() => {
    if (!goal) return;
    loadJar(db).then((j) => {
      setHadGoal(!!j.goalCents);
      setName(j.goalName ?? '');
      setAmount(j.goalCents ? String(j.goalCents / 100) : '');
    });
  }, [db, goal]);

  async function save() {
    const cents = toCents(amount);
    if (!(cents > 0)) return setError(goal ? 'What does it cost?' : 'How much goes in?');
    if (goal) {
      if (!name.trim()) return setError('Name it, like “Movie night for two”.');
      await setJarGoal(db, name.trim(), cents);
    } else {
      await addToJar(db, cents, 'Added by you', today());
    }
    router.back();
  }

  return (
    <Screen>
      <T variant="title">{goal ? 'What is the jar for?' : 'Add to the treat jar'}</T>
      {goal && <Field label="Goal" value={name} onChangeText={setName} placeholder="Movie night for two" autoFocus />}
      <Field
        label={goal ? 'It costs' : 'Amount'}
        value={amount}
        onChangeText={(v) => (setAmount(v), setError(''))}
        keyboardType="decimal-pad"
        placeholder={typed(goal ? 60 : 10, currency)}
        error={error}
        autoFocus={!goal}
      />
      <Button title={goal ? 'Save goal' : 'Add to jar'} variant={goal ? 'primary' : 'highlight'} onPress={save} />
      {goal && hadGoal && (
        <Button
          title="Remove goal"
          variant="danger"
          onPress={async () => {
            await setJarGoal(db, null, null);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
