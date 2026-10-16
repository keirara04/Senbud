// "I've used Senbud before" (design system 4.1b): a sheet, since there's no account to log in to.
// After a restore, Home replaces the whole stack so Welcome doesn't sit behind it.
import { space } from '@senbud/core/tokens';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { restoreBackup } from '@/backup';
import { loadSetup } from '@/db';
import { restorePro } from '@/purchases';
import { Button, Card, ListRow, Screen, T } from '@/ui';

export default function WelcomeBack() {
  const db = useSQLiteContext();
  return (
    <Screen>
      <T tone="textDim">There’s no account to log in to. Bring your things back here:</T>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <ListRow
          first
          label="Restore from a backup"
          onPress={() =>
            restoreBackup(db, async () => {
              if (!(await loadSetup(db))) return;
              router.dismissAll();
              router.replace('/');
            })
          }
        />
        <ListRow label="Restore Senbud Pro" onPress={() => restorePro(db)} />
      </Card>
      <T variant="caption" tone="textDim">
        Make a backup any time in Settings → Back up everything.
      </T>
      <Button title="Not now" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
