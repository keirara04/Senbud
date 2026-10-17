// Usage stats: events queue in SQLite (db.ts track()) and go to the API in batches, so offline use still
// counts. Sent on launch, when the app comes back, and when it goes to the background. Settings can turn
// them off, which also drops the queue.
import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { API_URL, headers } from '@/api';
import { loadApp, track } from '@/db';

const BATCH = 50; // the API's limit per request
const KEEP = 1000; // ponytail: a long offline stretch keeps only the newest 1000; plenty for usage counts

let sending = false;

export async function flush(db: SQLiteDatabase) {
  if (sending) return;
  sending = true;
  try {
    await db.runAsync(`DELETE FROM events_queue WHERE id NOT IN (SELECT id FROM events_queue ORDER BY at DESC LIMIT ${KEEP})`);
    const { deviceId } = await loadApp(db);
    for (;;) {
      const rows = await db.getAllAsync<{ id: string; name: string; props: string | null; at: string }>(`SELECT * FROM events_queue ORDER BY at LIMIT ${BATCH}`);
      if (!rows.length) return;
      const res = await fetch(`${API_URL}/v1/events`, {
        method: 'POST',
        headers: headers(deviceId),
        body: JSON.stringify({
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version,
          events: rows.map((r) => ({ id: r.id, name: r.name, at: r.at, ...(r.props ? { props: JSON.parse(r.props) } : {}) })),
        }),
      });
      // A 422 batch will never be accepted (an old app's event name, say), so it's dropped too.
      if (!res.ok && res.status !== 422) return;
      await db.runAsync(`DELETE FROM events_queue WHERE id IN (${rows.map(() => '?').join(', ')})`, ...rows.map((r) => r.id));
      if (rows.length < BATCH) return;
    }
  } catch {
    // Offline or the API is down: the queue waits for the next time.
  } finally {
    sending = false;
  }
}

// In the root layout: an app_open per launch and per return to the app, and a screen event per route.
export function Analytics() {
  const db = useSQLiteContext();
  const path = usePathname();
  useEffect(() => {
    track(db, 'app_open').then(() => flush(db));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') track(db, 'app_open').then(() => flush(db));
      else if (s === 'background') flush(db);
    });
    return () => sub.remove();
  }, [db]);
  useEffect(() => {
    track(db, 'screen', { path });
  }, [db, path]);
  return null;
}
