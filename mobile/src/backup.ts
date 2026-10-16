// Backup files: the account-free way to move Senbud to a new phone (Settings and Welcome).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert, Platform } from 'react-native';

import { importAll, loadApp } from '@/db';
import { applyTheme } from '@/ui';

export async function shareFile(name: string, content: string, mimeType: string, UTI: string) {
  // expo-file-system has no web support: the browser downloads the file instead.
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    return void setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: name });
}

const pickWebFile = () =>
  new Promise<string | null>((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve) : resolve(null));
    input.oncancel = () => resolve(null);
    input.click();
  });

/** Pick a backup, confirm, replace everything. Calls onRestored after a successful restore. */
export async function restoreBackup(db: SQLiteDatabase, onRestored: () => void) {
  const text = await (Platform.OS === 'web' ? pickWebFile() : File.pickFileAsync({ mimeTypes: 'application/json' }).then((p) => (p.canceled ? null : p.result.text())));
  if (text == null) return;
  let data: unknown;
  try {
    data = JSON.parse(text);
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
        onRestored();
        Alert.alert('Restored', 'Everything from the backup is on this phone now.');
      },
    },
  ]);
}
