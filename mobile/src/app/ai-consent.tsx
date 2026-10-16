// "Bud uses AI": the one consent sheet, opened by the first receipt or the first question.
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { AiUses, settleAiConsent } from '@/consent';
import { giveAiConsent } from '@/db';
import { Button, Screen, T } from '@/ui';

export default function AiConsent() {
  const db = useSQLiteContext();
  // Swiped away or closed: counts as Not now.
  useEffect(() => () => settleAiConsent(false), []);

  return (
    <Screen>
      <T variant="title">Bud uses AI for two things</T>
      <T tone="textDim">Agree once and both work. Turn AI off any time in Settings.</T>
      <AiUses />
      <Button
        title="Allow"
        onPress={async () => {
          await giveAiConsent(db);
          settleAiConsent(true);
          router.back();
        }}
      />
      <Button title="Not now" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
