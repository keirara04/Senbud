// Add a fixed bill (Budgets → Rent and bills). Set aside before anything counts as spendable.
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { typed, useCurrency } from '@/currencies';
import { addBill } from '@/db';
import { Button, Field, Screen, T } from '@/ui';

const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function BillSheet() {
  const db = useSQLiteContext();
  const currency = useCurrency();
  // Bud can open this prefilled with a bill it spotted.
  const params = useLocalSearchParams<{ name?: string; amount?: string; day?: string }>();
  const [name, setName] = useState(params.name ?? '');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [day, setDay] = useState(params.day ?? '');
  const [errors, setErrors] = useState<{ name?: string; amount?: string; day?: string }>({});

  async function save() {
    const cents = toCents(amount);
    const due = Number(day);
    const e: typeof errors = {};
    if (!name.trim() || name.trim().toLowerCase() === 'rent') e.name = name.trim() ? 'Rent lives in Budget and rent.' : 'Name it, like Phone or Wi-Fi.';
    if (!(cents > 0)) e.amount = 'Enter what it costs each month.';
    if (!(Number.isInteger(due) && due >= 1 && due <= 31)) e.day = 'A day from 1 to 31.';
    setErrors(e);
    if (Object.keys(e).length) return;
    await addBill(db, { name: name.trim(), cents, dueDay: due });
    router.back();
  }

  return (
    <Screen>
      <T variant="title">Add a bill</T>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Phone" error={errors.name} autoFocus />
      <Field label="Amount each month" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={typed(38, currency)} error={errors.amount} />
      <Field label="Due on day" value={day} onChangeText={setDay} keyboardType="number-pad" placeholder="5" error={errors.day} />
      <Button title="Add bill" onPress={save} />
    </Screen>
  );
}
