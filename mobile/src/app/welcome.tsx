// Welcome (design system 4.1b): first launch, before Setup. No sign-in wall: Senbud has no accounts,
// so returning people get what actually brings their data back, a backup file and Restore purchases.
import { space } from '@senbud/core/tokens';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { Bud } from '@/art';
import { restoreBackup } from '@/backup';
import { loadSetup } from '@/db';
import { restorePro } from '@/purchases';
import { Button, Card, Icon, ListRow, Marker, Screen, T, TextButton, useTheme } from '@/ui';

const PROMISES = ['No bank login', 'No account', 'Stays on your phone'];

export default function Welcome() {
  const db = useSQLiteContext();
  const t = useTheme();
  const [back, setBack] = useState(false);

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityRole="header" accessibilityLabel="Senbud">
          <T variant="hero">Sen</T>
          <Marker>
            <T variant="hero">bud</T>
          </Marker>
        </View>
        <Bud size={170} />
        <T variant="title">Your money buddy</T>
        <T tone="textDim" style={{ textAlign: 'center' }}>
          Snap or type what you spend. Senbud tells you what’s safe to spend today and when rent is coming.
        </T>
        <View style={{ gap: space.xs, alignSelf: 'stretch', paddingHorizontal: space.lg }}>
          {PROMISES.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={20} color={t.good} />
              <T>{p}</T>
            </View>
          ))}
        </View>
      </View>

      <Button title="Get started" onPress={() => router.push('/setup')} />
      <TextButton title="I’ve used Senbud before" onPress={() => setBack((b) => !b)} />

      {back && (
        <Card style={{ gap: space.sm }}>
          <T variant="bodyStrong">Welcome back</T>
          <T tone="textDim">Senbud keeps everything on your phone, so there’s no account to log in to. Bring things back here:</T>
          <View>
            <ListRow
              first
              label="Restore from a backup"
              onPress={() => restoreBackup(db, async () => (await loadSetup(db)) && router.replace('/'))}
            />
            <ListRow label="Restore Senbud Pro" onPress={() => restorePro(db)} />
          </View>
          <T variant="caption" tone="textDim">
            Make a backup any time in Settings → Back up everything.
          </T>
        </Card>
      )}
    </Screen>
  );
}
