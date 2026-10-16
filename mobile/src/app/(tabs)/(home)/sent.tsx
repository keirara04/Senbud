// "What gets sent" (Settings → AI): the same cards as the "Bud uses AI" sheet, then the switch.
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { AiUses } from '@/consent';
import { loadApp, setAiEnabled } from '@/db';
import { AiSwitch, Card, Screen } from '@/ui';

export default function WhatGetsSent() {
  const db = useSQLiteContext();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    loadApp(db).then((a) => setOn(a.aiEnabled));
  }, [db]);

  return (
    <Screen>
      <AiUses />
      {on !== null && (
        <Card style={{ gap: 0, paddingVertical: 0 }}>
          <AiSwitch
            value={on}
            onChange={async (v) => {
              await setAiEnabled(db, v);
              setOn(v);
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
