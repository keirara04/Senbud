// Settings (design system 4.8): Money, AI, Look, Your data, Senbud Pro, then Erase on its own.
// No accounts: a backup file is how data moves to a new phone.
import { money, toCsv } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { File, Paths } from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import Purchases from 'react-native-purchases';

import { type AppState, eraseAll, exportAll, importAll, listTransactions, loadApp, loadSetup, setAiEnabled, setPro, type Setup, setTheme, type Theme, today } from '@/db';
import { hasPro, PRIVACY, purchasesReady, TERMS } from '@/purchases';
import { AiSwitch, applyTheme, Button, Card, ListGroup, ListRow, Row, Screen, Segmented, T, TextButton } from '@/ui';

async function shareFile(name: string, content: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

export default function Settings() {
  const db = useSQLiteContext();
  const [app, setApp] = useState<AppState | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, s] = await Promise.all([loadApp(db), loadSetup(db)]);
    setApp(a);
    setSetup(s);
    if (a.pro && purchasesReady()) Purchases.getCustomerInfo().then((i) => setManageUrl(i.managementURL), () => {});
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!app) return null;
  const profile = setup?.profile ?? { currency: 'USD', locale: 'en-US' };
  const fmt = (cents: number) => money(cents / 100, profile.currency, profile.locale);

  async function toggleAi(on: boolean) {
    await setAiEnabled(db, on);
    setApp((a) => a && { ...a, aiEnabled: on });
  }

  async function pickTheme(theme: Theme) {
    await setTheme(db, theme);
    applyTheme(theme);
    setApp((a) => a && { ...a, theme });
  }

  async function exportCsv() {
    const txns = await listTransactions(db);
    if (!txns.length) return Alert.alert('Nothing to export yet', 'Add an expense first.');
    await shareFile(`senbud-spending-${today()}.csv`, toCsv(txns, profile.currency), 'text/csv', 'public.comma-separated-values-text');
  }

  async function backUp() {
    await shareFile(`senbud-backup-${today()}.json`, JSON.stringify(await exportAll(db)), 'application/json', 'public.json');
  }

  async function restoreBackup() {
    const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
    if (picked.canceled) return;
    let data: unknown;
    try {
      data = JSON.parse(await picked.result.text());
    } catch {
      return Alert.alert('That file isn’t a Senbud backup', 'Pick the .json file from Back up everything.');
    }
    Alert.alert('Replace everything on this phone?', 'Your expenses, budget, IOUs and treats here are swapped for the ones in the backup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          try {
            await importAll(db, data);
          } catch (e) {
            return Alert.alert('Couldn’t restore', e instanceof Error && e.message.includes('newer') ? 'This backup is from a newer Senbud. Update the app, then try again.' : 'That file isn’t a Senbud backup.');
          }
          applyTheme((await loadApp(db)).theme);
          await load();
          Alert.alert('Restored', 'Everything from the backup is on this phone now.');
        },
      },
    ]);
  }

  async function restorePurchases() {
    if (!purchasesReady()) return Alert.alert('Not available', 'Purchases aren’t set up in this build.');
    try {
      const pro = hasPro(await Purchases.restorePurchases());
      await setPro(db, pro);
      await load();
      Alert.alert(pro ? 'Senbud Pro restored' : 'Nothing to restore', pro ? undefined : 'No Senbud Pro purchase found on this Apple or Google account.');
    } catch {
      Alert.alert('Couldn’t reach the store', 'Try again in a moment.');
    }
  }

  function erase() {
    Alert.alert('Erase all data?', 'This deletes every expense, budget, IOU and treat on this phone. Export first if you want a copy. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          await eraseAll(db);
          applyTheme('system');
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <Screen>
      <ListGroup title="Money">
        <ListRow first label="Currency" value={profile.currency} onPress={() => router.push('/setup')} />
        <ListRow label="Hourly rate" value={app.hourlyRateCents ? `${fmt(app.hourlyRateCents)}/hr` : 'Not set'} onPress={() => router.push('/rate')} />
        <ListRow label="Budget and rent" value={setup ? `${fmt(setup.budget.cents)} a ${setup.budget.period.kind}` : undefined} onPress={() => router.push('/setup')} />
      </ListGroup>

      <ListGroup title="AI" footer="Typing “kopi 4.50” always works, AI or not. Everything is stored on this phone.">
        <AiSwitch value={app.aiEnabled} onChange={toggleAi} />
        <ListRow label="What gets sent" onPress={() => router.push('/sent')} />
      </ListGroup>

      <View style={{ gap: space.sm }}>
        <T variant="label" tone="textDim">
          Look
        </T>
        <Segmented
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          value={app.theme}
          onChange={pickTheme}
        />
      </View>

      <ListGroup title="Your data" footer="A backup is how your data moves to a new phone. Senbud has no account to sync.">
        <ListRow first label="Export spending (CSV)" onPress={exportCsv} />
        <ListRow label="Back up everything" onPress={backUp} />
        <ListRow label="Restore from a backup" onPress={restoreBackup} />
      </ListGroup>

      <View style={{ gap: space.sm }}>
        <T variant="label" tone="textDim">
          Senbud Pro
        </T>
        <Card>
          {app.pro ? (
            <>
              <T variant="bodyStrong">Senbud Pro · Active</T>
              {manageUrl ? <TextButton title="Manage" onPress={() => Linking.openURL(manageUrl)} /> : null}
            </>
          ) : (
            <>
              <T>Senbud Pro does the typing for you: snap receipts, unlimited assistant, subscription reminders.</T>
              <Button title="See plans" onPress={() => router.push('/pro')} />
              <TextButton title="Restore purchases" onPress={restorePurchases} />
            </>
          )}
        </Card>
      </View>

      <Button title="Erase all data" variant="danger" onPress={erase} />
      <Row style={{ justifyContent: 'center' }}>
        <TextButton title="Privacy" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(PRIVACY)} />
        <T tone="textDim">·</T>
        <TextButton title="Terms" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(TERMS)} />
      </Row>
    </Screen>
  );
}
