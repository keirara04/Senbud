// Backup files: the account-free way to move Senbud to a new phone (Settings and Welcome), and importing
// spending from a CSV (Senbud's own export or a bank statement).
import { fromCsv } from '@senbud/core';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert, Platform } from 'react-native';

import { addTransactions, importAll, listTransactions, loadApp, type Profile } from '@/db';
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

const pickWebFile = (accept: string) =>
  new Promise<string | null>((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve) : resolve(null));
    input.oncancel = () => resolve(null);
    input.click();
  });

/** Pick a backup, confirm, replace everything. Calls onRestored after a successful restore. */
export async function restoreBackup(db: SQLiteDatabase, onRestored: () => void) {
  const text = await (Platform.OS === 'web' ? pickWebFile('application/json,.json') : File.pickFileAsync({ mimeTypes: 'application/json' }).then((p) => (p.canceled ? null : p.result.text())));
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

// Banks label CSVs all sorts of ways; Android often says vnd.ms-excel.
const CSV_TYPES = ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'];
const fmtDay = (d: string, locale: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Pick a CSV, show what it holds, add the spending after a yes. Rows already here are skipped. */
export async function importCsv(db: SQLiteDatabase, profile: Profile, onDone: () => void) {
  const text = await (Platform.OS === 'web' ? pickWebFile('.csv,text/csv') : File.pickFileAsync({ mimeTypes: CSV_TYPES }).then((p) => (p.canceled ? null : p.result.text())));
  if (text == null) return;
  // Month-first dates only where people write them that way; the file overrides this when a day is over 12.
  const r = fromCsv(text, { dayFirst: !profile.locale.endsWith('-US'), existing: await listTransactions(db) });
  if (r.error) return Alert.alert('Couldn’t read that file', 'Senbud looks for a date, a description and an amount (or money out) column, with names in the first row.');
  const extra = [r.duplicates && `${r.duplicates} already here`, r.skipped && `${r.skipped} skipped (money in, or not readable)`].filter(Boolean).join(', ');
  if (!r.rows.length) return Alert.alert('Nothing new to add', extra ? `${extra[0].toUpperCase()}${extra.slice(1)}.` : 'The file has no spending in it.');
  const dates = r.rows.map((x) => x.date).sort();
  const n = r.rows.length;
  Alert.alert(`Add ${n} ${n === 1 ? 'expense' : 'expenses'}?`, `${fmtDay(dates[0], profile.locale)} to ${fmtDay(dates[n - 1], profile.locale)}, amounts in ${profile.currency}.${extra ? ` ${extra[0].toUpperCase()}${extra.slice(1)}.` : ''} Categories are a best guess.`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Add',
      onPress: async () => {
        await addTransactions(db, r.rows);
        onDone();
      },
    },
  ]);
}
