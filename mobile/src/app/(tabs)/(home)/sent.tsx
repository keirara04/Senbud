// "What gets sent" (Settings → AI): plain answers before the switch. Card 1 is the receipt consent
// copy from receipt.tsx word for word; card 2 is spec 3's rule for what the assistant sees.
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { loadApp, setAiEnabled } from '@/db';
import { AiSwitch, Card, Screen, T } from '@/ui';

export default function WhatGetsSent() {
  const db = useSQLiteContext();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    loadApp(db).then((a) => setOn(a.aiEnabled));
  }, [db]);

  return (
    <Screen>
      <Card>
        <T variant="bodyStrong">When you snap a receipt</T>
        <T>To read a receipt, Senbud sends the photo to its server and on to an AI model (currently Google Gemini) through OpenRouter.</T>
        <T>The photo is used only to read this receipt. Senbud doesn’t store or log it, and only providers that keep no data are used.</T>
      </Card>
      <Card>
        <T variant="bodyStrong">When you ask a question</T>
        <T>Your question, plus a short summary: this month’s totals, your budget and rent, and your last 20 expenses. Never your full history.</T>
      </Card>
      <Card>
        <T variant="bodyStrong">Never leaves the phone</T>
        <T>Every expense you type, friends’ names, treats and the treat jar.</T>
      </Card>
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
