// Local reminders: rent and bills, renewals (Pro) and "your budget resets tomorrow". Core works out the
// schedule; this file hands it to the phone. No server and no push token, so nothing leaves the device.
import { money, reminderSchedule, type ReminderKind } from '@senbud/core';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { listBills, listSubscriptions, loadApp, loadSetup, today } from '@/db';

// Web has no scheduled notifications.
const SUPPORTED = Platform.OS !== 'web';

// Show a reminder that comes due while the app is open, too.
if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** Asks the first time a reminder switch is turned on. Android 13 shows the prompt only once a channel exists. */
export async function allowReminders(): Promise<boolean> {
  if (!SUPPORTED) return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: AndroidImportance.DEFAULT });
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Cancels everything and schedules again from the current data. Call after any change to money data. */
// ponytail: cancel-all plus up to 48 schedules on every focus; diff against getAllScheduledNotificationsAsync by identifier if it shows on old phones.
export async function syncReminders(db: SQLiteDatabase) {
  if (!SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [setup, app] = await Promise.all([loadSetup(db), loadApp(db)]);
  const kinds = app.reminders.filter((k): k is ReminderKind => k !== 'renewals' || app.pro);
  if (!setup || !kinds.length || !(await Notifications.getPermissionsAsync()).granted) return;
  const [bills, subscriptions] = await Promise.all([listBills(db), listSubscriptions(db)]);
  const { currency, locale } = setup.profile;
  const list = reminderSchedule({ kinds, bills, subscriptions, period: setup.budget.period, today: today(), fmt: (c) => money(c / 100, currency, locale) });
  const now = Date.now();
  for (const r of list) {
    // Local wall-clock time: new Date('YYYY-MM-DD') would be UTC midnight, the evening before in UTC+8.
    const [y, m, d] = r.date.split('-').map(Number);
    const date = new Date(y, m - 1, d, r.hour);
    if (date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'reminders' },
    });
  }
}
