// Settings → Rent: the onboarding Rent step as a sheet. "No rent" removes the Rent bill.
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadSetup, type Setup, saveSetup } from '@/db';
import { padValue, RentStep, toCents } from '@/onboarding';
import { Screen } from '@/ui';

export default function EditRent() {
  const db = useSQLiteContext();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [hasRent, setHasRent] = useState<boolean | null>(null);
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState(1);

  useEffect(() => {
    loadSetup(db).then((s) => {
      if (!s) return;
      setSetup(s);
      setHasRent(!!s.rent);
      if (s.rent) {
        setRent(padValue(s.rent.cents));
        setDueDay(s.rent.dueDay);
      }
    });
  }, [db]);

  if (!setup) return null;
  return (
    <Screen>
      <RentStep
        hasRent={hasRent}
        onHasRent={setHasRent}
        rent={rent}
        onRent={setRent}
        dueDay={dueDay}
        onDueDay={setDueDay}
        profile={setup.profile}
        nextTitle="Save"
        onNext={async () => {
          await saveSetup(db, { ...setup, rent: hasRent ? { name: 'Rent', cents: toCents(rent), dueDay } : null });
          router.back();
        }}
      />
    </Screen>
  );
}
