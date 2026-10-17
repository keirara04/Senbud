// Local storage: one SQLite file, plain SQL, numbered migrations. All money is integer cents.
import { type Bill, type BudgetPeriod, type Category, type Iou, type IsoDate, periodRange, type ReminderKind, type Subscription, type Transaction, type Treat } from '@senbud/core';
import type { SQLiteDatabase } from 'expo-sqlite';

// A random v4 UUID from SQLite's own CSPRNG, so no native crypto module is needed.
const UUID_SQL = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', 1 + abs(random()) % 4, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))`;
const NEW_APP_ROW = `INSERT INTO app (id, device_id) VALUES (1, ${UUID_SQL});`;

// Append only; never edit a shipped migration. PRAGMA user_version records how many have run.
const MIGRATIONS = [
  `CREATE TABLE transactions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL,
     cents INTEGER NOT NULL,
     label TEXT NOT NULL,
     category TEXT NOT NULL,
     source TEXT NOT NULL DEFAULT 'manual'
   );
   CREATE INDEX transactions_date ON transactions(date);
   CREATE TABLE budget (id INTEGER PRIMARY KEY CHECK (id = 1), cents INTEGER NOT NULL, kind TEXT NOT NULL, start INTEGER NOT NULL);
   CREATE TABLE bills (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cents INTEGER NOT NULL, due_day INTEGER NOT NULL);
   CREATE TABLE profile (id INTEGER PRIMARY KEY CHECK (id = 1), currency TEXT NOT NULL, locale TEXT NOT NULL);`,
  // 2: app state that exists before setup: anonymous device id (the API's rate-limit key), AI consent, Pro.
  `CREATE TABLE app (id INTEGER PRIMARY KEY CHECK (id = 1), device_id TEXT NOT NULL, ai_consent_at TEXT, pro INTEGER NOT NULL DEFAULT 0);
   ${NEW_APP_ROW}`,
  // 3: the Phase 1 screens. Budgets (category limits, bills), Treats (treats, jar + history), Friends
  // (ious), subscriptions, merchant rules, and Settings on the app row.
  `CREATE TABLE category_limits (category TEXT PRIMARY KEY, cents INTEGER NOT NULL);
   CREATE TABLE treats (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, last_cents INTEGER NOT NULL, last_date TEXT, min_days INTEGER NOT NULL DEFAULT 7);
   CREATE TABLE treat_jar (id INTEGER PRIMARY KEY CHECK (id = 1), balance_cents INTEGER NOT NULL DEFAULT 0, goal_name TEXT, goal_cents INTEGER);
   INSERT INTO treat_jar (id) VALUES (1);
   CREATE TABLE treat_jar_history (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, cents INTEGER NOT NULL, note TEXT NOT NULL);
   CREATE TABLE ious (id INTEGER PRIMARY KEY AUTOINCREMENT, friend TEXT NOT NULL, cents INTEGER NOT NULL, direction TEXT NOT NULL, note TEXT NOT NULL, date TEXT NOT NULL, paid INTEGER NOT NULL DEFAULT 0, split_id TEXT);
   CREATE TABLE subscriptions (merchant TEXT PRIMARY KEY, cents INTEGER NOT NULL, interval TEXT NOT NULL, next_date TEXT NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE rules (merchant TEXT PRIMARY KEY, category TEXT NOT NULL);
   ALTER TABLE app ADD COLUMN hourly_rate_cents INTEGER;
   ALTER TABLE app ADD COLUMN ai_enabled INTEGER NOT NULL DEFAULT 1;
   ALTER TABLE app ADD COLUMN theme TEXT NOT NULL DEFAULT 'system';`,
  // 4: Dark is the default look; Light and System stay in Settings.
  `UPDATE app SET theme = 'dark' WHERE theme = 'system';`,
  // 5: the start of the budget period Senbud last looked back on (month-end leftover). NULL until the
  // first check, which records the current period without asking.
  `ALTER TABLE app ADD COLUMN period_handled TEXT;`,
  // 6: consent to send questions to Bud's AI, apart from the receipt-photo consent.
  `ALTER TABLE app ADD COLUMN ask_consent_at TEXT;`,
  // 7: Bud's notes dismissed with "Not today", by note key (and "home" for Home's card), until tomorrow.
  `CREATE TABLE nudge_dismissals (key TEXT PRIMARY KEY, date TEXT NOT NULL);`,
  // 8: one AI consent for photos and questions (the "Bud uses AI" sheet). ask_consent_at stays but is
  // unused; anyone who agreed to photos only is asked once more.
  `UPDATE app SET ai_consent_at = NULL WHERE ask_consent_at IS NULL;`,
  // 9: the day each bill was added; a due date before it was never owed. Existing bills count from the
  // first logged expense (roughly when the app was set up), or from the day this runs if there are none.
  `ALTER TABLE bills ADD COLUMN added_on TEXT;
   UPDATE bills SET added_on = COALESCE((SELECT MIN(date) FROM transactions), '${today()}');`,
  // 10: which local reminders are on, as a comma list of core's ReminderKind. Off until the person agrees.
  // Not in backups: notification permission belongs to the phone, so a new phone asks again.
  `ALTER TABLE app ADD COLUMN reminders TEXT NOT NULL DEFAULT '';`,
  // 11: usage stats waiting to be sent (analytics.ts), and the Settings switch for them. On by default.
  `CREATE TABLE events_queue (id TEXT PRIMARY KEY, name TEXT NOT NULL, props TEXT, at TEXT NOT NULL);
   ALTER TABLE app ADD COLUMN analytics INTEGER NOT NULL DEFAULT 1;`,
];

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

export type Txn = Transaction & { id: number };
export type Budget = { cents: number; period: Extract<BudgetPeriod, { kind: 'week' | 'month' }> };
export type Profile = { currency: string; locale: string };
export type Setup = { budget: Budget; rent: Bill | null; profile: Profile };

export async function loadSetup(db: SQLiteDatabase): Promise<Setup | null> {
  const b = await db.getFirstAsync<{ cents: number; kind: 'week' | 'month'; start: number }>('SELECT * FROM budget');
  const p = await db.getFirstAsync<Profile>('SELECT currency, locale FROM profile');
  if (!b || !p) return null;
  const rent = await db.getFirstAsync<{ name: string; cents: number; due_day: number; added_on: string | null }>("SELECT * FROM bills WHERE name = 'Rent' LIMIT 1");
  const period = b.kind === 'week' ? { kind: 'week' as const, startWeekday: b.start } : { kind: 'month' as const, startDay: b.start };
  return {
    budget: { cents: b.cents, period },
    rent: rent && { name: rent.name, cents: rent.cents, dueDay: rent.due_day, addedOn: rent.added_on ?? undefined },
    profile: p,
  };
}

// Setup owns the Rent bill only; other bills are managed on Budgets. Rent keeps the day it was first added.
export async function saveSetup(db: SQLiteDatabase, { budget, rent, profile }: Setup) {
  const start = budget.period.kind === 'week' ? budget.period.startWeekday : budget.period.startDay;
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR REPLACE INTO budget (id, cents, kind, start) VALUES (1, ?, ?, ?)', budget.cents, budget.period.kind, start);
    await db.runAsync('INSERT OR REPLACE INTO profile (id, currency, locale) VALUES (1, ?, ?)', profile.currency, profile.locale);
    await db.runAsync("DELETE FROM bills WHERE name = 'Rent'");
    if (rent) await db.runAsync('INSERT INTO bills (name, cents, due_day, added_on) VALUES (?, ?, ?, ?)', 'Rent', rent.cents, rent.dueDay, rent.addedOn ?? today());
    // A new or changed budget starts fresh: no month-end offer for a period it didn't cover.
    await db.runAsync('UPDATE app SET period_handled = ?', periodRange(budget.period, today()).start);
  });
}

// Currency on its own (Settings → Currency). The profile row can exist before Setup has run.
export const loadProfile = (db: SQLiteDatabase) => db.getFirstAsync<Profile>('SELECT currency, locale FROM profile');
export const setCurrency = (db: SQLiteDatabase, currency: string, locale: string) =>
  db.runAsync('INSERT INTO profile (id, currency, locale) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET currency = excluded.currency', currency, locale);

export async function addTransactions(db: SQLiteDatabase, txns: Transaction[]): Promise<number[]> {
  const ids: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const t of txns) {
      const r = await db.runAsync(
        'INSERT INTO transactions (date, cents, label, category, source) VALUES (?, ?, ?, ?, ?)',
        t.date, t.cents, t.label, t.category, t.source ?? 'manual',
      );
      ids.push(r.lastInsertRowId);
    }
  });
  if (txns.length) track(db, 'txn_added', { source: txns[0].source ?? 'manual', count: txns.length });
  return ids;
}

// Undo after a delete: puts the rows back with their own ids, so anything that pointed at them still does.
export async function restoreTransactions(db: SQLiteDatabase, txns: Txn[]) {
  await db.withTransactionAsync(async () => {
    for (const t of txns)
      await db.runAsync(
        'INSERT OR IGNORE INTO transactions (id, date, cents, label, category, source) VALUES (?, ?, ?, ?, ?, ?)',
        t.id, t.date, t.cents, t.label, t.category, t.source ?? 'manual',
      );
  });
}

export const deleteTransactions = (db: SQLiteDatabase, ids: number[]) =>
  db.runAsync(`DELETE FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);

export async function listTransactions(db: SQLiteDatabase, since?: IsoDate): Promise<Txn[]> {
  const rows = await db.getAllAsync<Txn & { category: Category }>(
    `SELECT id, date, cents, label, category, source FROM transactions ${since ? 'WHERE date >= ?' : ''} ORDER BY date DESC, id DESC`,
    ...(since ? [since] : []),
  );
  return rows;
}

// "Erase all data": every row gone, schema kept. A fresh device id too, so nothing links the old data to the new.
export const eraseAll = (db: SQLiteDatabase) =>
  db.withTransactionAsync(() => db.execAsync(`DELETE FROM transactions; DELETE FROM budget; DELETE FROM bills; DELETE FROM profile; DELETE FROM app; ${NEW_APP_ROW}
    DELETE FROM category_limits; DELETE FROM treats; DELETE FROM treat_jar_history; DELETE FROM ious; DELETE FROM subscriptions; DELETE FROM rules; DELETE FROM nudge_dismissals; DELETE FROM events_queue;
    UPDATE treat_jar SET balance_cents = 0, goal_name = NULL, goal_cents = NULL; UPDATE app SET theme = 'dark';`));

// "Back up everything": every user table as rows, plus the app settings. Not nudge_dismissals: they
// only last a day. Not device_id (a new phone
// gets its own) and not pro (the store owns that; Restore purchases brings it back).
const BACKUP_TABLES = ['transactions', 'budget', 'bills', 'profile', 'category_limits', 'treats', 'treat_jar', 'treat_jar_history', 'ious', 'subscriptions', 'rules'];
const BACKUP_SETTINGS = ['hourly_rate_cents', 'ai_enabled', 'theme', 'ai_consent_at', 'analytics'];
type Row = Record<string, string | number | null>;
export type Backup = { app: 'senbud'; schema: number; tables: Record<string, Row[]>; settings: Row };

export async function exportAll(db: SQLiteDatabase): Promise<Backup> {
  const tables: Record<string, Row[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
  const settings = (await db.getFirstAsync<Row>(`SELECT ${BACKUP_SETTINGS.join(', ')} FROM app`)) ?? {};
  return { app: 'senbud', schema: MIGRATIONS.length, tables, settings };
}

// Replaces everything with a backup file the person picked. The file is untrusted: column names must
// exist in the table (they go into SQL), values must be plain numbers, strings or null.
export async function importAll(db: SQLiteDatabase, data: unknown) {
  const b = data as Partial<Backup>;
  if (b?.app !== 'senbud' || typeof b.schema !== 'number' || typeof b.tables !== 'object' || !b.tables) throw new Error('not a Senbud backup');
  if (b.schema > MIGRATIONS.length) throw new Error('backup is from a newer Senbud');
  const plain = (v: unknown) => v === null || typeof v === 'string' || typeof v === 'number';
  await db.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) {
      const cols = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
      await db.runAsync(`DELETE FROM ${t}`);
      for (const row of b.tables![t] ?? []) {
        const keys = Object.keys(row).filter((k) => cols.has(k) && plain(row[k]));
        if (keys.length) await db.runAsync(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, ...keys.map((k) => row[k]));
      }
    }
    await db.runAsync('INSERT OR IGNORE INTO treat_jar (id) VALUES (1)');
    // Bills from a backup made before 9 count from today, as the migration does.
    await db.runAsync('UPDATE bills SET added_on = ? WHERE added_on IS NULL', today());
    const s = b.settings ?? {};
    for (const k of BACKUP_SETTINGS) {
      if (!(k in s) || !plain(s[k])) continue;
      if (k === 'theme' && !['system', 'light', 'dark'].includes(s[k] as string)) continue; // goes to Appearance
      await db.runAsync(`UPDATE app SET ${k} = ?`, s[k]);
    }
    // Before 8, ai_consent_at covered photos only (see migration 8).
    if ((b.schema ?? 0) < 8 && !s.ask_consent_at) await db.runAsync('UPDATE app SET ai_consent_at = NULL');
  });
}

export type Theme = 'system' | 'light' | 'dark';
export type AppState = { deviceId: string; aiConsentAt: string | null; pro: boolean; hourlyRateCents: number | null; aiEnabled: boolean; theme: Theme; periodHandled: IsoDate | null; reminders: ReminderKind[]; analytics: boolean };

export async function loadApp(db: SQLiteDatabase): Promise<AppState> {
  const r = await db.getFirstAsync<{ device_id: string; ai_consent_at: string | null; pro: number; hourly_rate_cents: number | null; ai_enabled: number; theme: Theme; period_handled: string | null; reminders: string; analytics: number }>('SELECT * FROM app');
  if (!r) throw new Error('app row missing; migrations did not run');
  return { deviceId: r.device_id, aiConsentAt: r.ai_consent_at, pro: r.pro === 1, hourlyRateCents: r.hourly_rate_cents, aiEnabled: r.ai_enabled === 1, theme: r.theme, periodHandled: r.period_handled, reminders: r.reminders ? (r.reminders.split(',') as ReminderKind[]) : [], analytics: r.analytics === 1 };
}

export const giveAiConsent = (db: SQLiteDatabase) => db.runAsync('UPDATE app SET ai_consent_at = ?', new Date().toISOString());
export const setPro = (db: SQLiteDatabase, pro: boolean) => db.runAsync('UPDATE app SET pro = ?', pro ? 1 : 0);
export const setHourlyRate = (db: SQLiteDatabase, cents: number | null) => db.runAsync('UPDATE app SET hourly_rate_cents = ?', cents);
// Turning AI off also withdraws consent, so turning it back on shows the "Bud uses AI" sheet again.
export const setAiEnabled = (db: SQLiteDatabase, on: boolean) =>
  db.runAsync(on ? 'UPDATE app SET ai_enabled = 1' : 'UPDATE app SET ai_enabled = 0, ai_consent_at = NULL');
export const setTheme = (db: SQLiteDatabase, theme: Theme) => db.runAsync('UPDATE app SET theme = ?', theme);
export const setReminders = (db: SQLiteDatabase, kinds: ReminderKind[]) => db.runAsync('UPDATE app SET reminders = ?', kinds.join(','));
// Usage stats (analytics.ts sends them). Turning them off also drops anything not sent yet.
export const setAnalytics = (db: SQLiteDatabase, on: boolean) =>
  db.execAsync(on ? 'UPDATE app SET analytics = 1' : 'UPDATE app SET analytics = 0; DELETE FROM events_queue');
// Queues one usage event, only while usage stats are on. Must be a name in api EventController::APP_EVENTS.
// Props are labels and counts only: never amounts, shop names or anything typed.
export type EventName = 'app_open' | 'screen' | 'setup_done' | 'txn_added' | 'limit_set' | 'treat_added' | 'pro_bought';
export function track(db: SQLiteDatabase, name: EventName, props?: Record<string, string | number | boolean>) {
  return db
    .runAsync(`INSERT INTO events_queue (id, name, props, at) SELECT ${UUID_SQL}, ?, ?, ? WHERE (SELECT analytics FROM app) = 1`, name, props ? JSON.stringify(props) : null, new Date().toISOString())
    .catch(() => {});
}
export const setPeriodHandled = (db: SQLiteDatabase, start: IsoDate) => db.runAsync('UPDATE app SET period_handled = ?', start);

// Budgets: category limits and bills.
export async function loadLimits(db: SQLiteDatabase): Promise<Partial<Record<Category, number>>> {
  const rows = await db.getAllAsync<{ category: Category; cents: number }>('SELECT * FROM category_limits');
  return Object.fromEntries(rows.map((r) => [r.category, r.cents]));
}
export async function setLimit(db: SQLiteDatabase, category: Category, cents: number | null) {
  await (cents ? db.runAsync('INSERT OR REPLACE INTO category_limits (category, cents) VALUES (?, ?)', category, cents) : db.runAsync('DELETE FROM category_limits WHERE category = ?', category));
  track(db, 'limit_set', { category, on: !!cents });
}

export type BillRow = Bill & { id: number };
export async function listBills(db: SQLiteDatabase): Promise<BillRow[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; cents: number; due_day: number; added_on: string | null }>('SELECT * FROM bills ORDER BY due_day, id');
  return rows.map((r) => ({ id: r.id, name: r.name, cents: r.cents, dueDay: r.due_day, addedOn: r.added_on ?? undefined }));
}
export const addBill = (db: SQLiteDatabase, b: Bill) =>
  db.runAsync('INSERT INTO bills (name, cents, due_day, added_on) VALUES (?, ?, ?, ?)', b.name, b.cents, b.dueDay, b.addedOn ?? today());
export const deleteBill = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM bills WHERE id = ?', id);

// Treats and the jar.
export type TreatRow = Treat & { id: number };
export async function listTreats(db: SQLiteDatabase): Promise<TreatRow[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; last_cents: number; last_date: string | null; min_days: number }>('SELECT * FROM treats ORDER BY name');
  return rows.map((r) => ({ id: r.id, name: r.name, lastCents: r.last_cents, lastDate: r.last_date ?? undefined, minDaysBetween: r.min_days }));
}
export async function addTreat(db: SQLiteDatabase, t: Treat) {
  await db.runAsync('INSERT INTO treats (name, last_cents, last_date, min_days) VALUES (?, ?, ?, ?)', t.name, t.lastCents, t.lastDate ?? null, t.minDaysBetween);
  track(db, 'treat_added', { learned: !!t.lastDate });
}
export const deleteTreat = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM treats WHERE id = ?', id);

export type Jar = { balanceCents: number; goalName: string | null; goalCents: number | null };
export async function loadJar(db: SQLiteDatabase): Promise<Jar> {
  const r = await db.getFirstAsync<{ balance_cents: number; goal_name: string | null; goal_cents: number | null }>('SELECT * FROM treat_jar');
  return { balanceCents: r?.balance_cents ?? 0, goalName: r?.goal_name ?? null, goalCents: r?.goal_cents ?? null };
}
export async function addToJar(db: SQLiteDatabase, cents: number, note: string, date: IsoDate) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE treat_jar SET balance_cents = MAX(0, balance_cents + ?)', cents);
    await db.runAsync('INSERT INTO treat_jar_history (date, cents, note) VALUES (?, ?, ?)', date, cents, note);
  });
}
export const setJarGoal = (db: SQLiteDatabase, name: string | null, cents: number | null) =>
  db.runAsync('UPDATE treat_jar SET goal_name = ?, goal_cents = ?', name, cents);
export const jarHistory = (db: SQLiteDatabase, limit = 5) =>
  db.getAllAsync<{ id: number; date: string; cents: number; note: string }>('SELECT * FROM treat_jar_history ORDER BY date DESC, id DESC LIMIT ?', limit);

// Friends.
export type IouRow = Iou & { id: number };
export async function listIous(db: SQLiteDatabase): Promise<IouRow[]> {
  const rows = await db.getAllAsync<{ id: number; friend: string; cents: number; direction: Iou['direction']; note: string; date: string; paid: number }>(
    'SELECT * FROM ious ORDER BY date DESC, id DESC',
  );
  return rows.map((r) => ({ id: r.id, friend: r.friend, cents: r.cents, direction: r.direction, note: r.note, date: r.date, paid: r.paid === 1 }));
}
export async function addIous(db: SQLiteDatabase, ious: Iou[]) {
  await db.withTransactionAsync(async () => {
    for (const i of ious)
      await db.runAsync('INSERT INTO ious (friend, cents, direction, note, date, paid) VALUES (?, ?, ?, ?, ?, ?)', i.friend, i.cents, i.direction, i.note, i.date, i.paid ? 1 : 0);
  });
}
// By id, so Undo reopens only what was just marked, never older settled IOUs.
export const setIousPaid = (db: SQLiteDatabase, ids: number[], paid: boolean) =>
  db.runAsync(`UPDATE ious SET paid = ? WHERE id IN (${ids.map(() => '?').join(',')})`, paid ? 1 : 0, ...ids);

// Subscriptions (detected, then confirmed by the person).
export async function listSubscriptions(db: SQLiteDatabase): Promise<Subscription[]> {
  const rows = await db.getAllAsync<{ merchant: string; cents: number; interval: Subscription['interval']; next_date: string; confirmed: number }>('SELECT * FROM subscriptions');
  return rows.map((r) => ({ merchant: r.merchant, cents: r.cents, interval: r.interval, nextDate: r.next_date, confirmed: r.confirmed === 1 }));
}
export const saveSubscription = (db: SQLiteDatabase, s: Subscription) =>
  db.runAsync('INSERT OR REPLACE INTO subscriptions (merchant, cents, interval, next_date, confirmed) VALUES (?, ?, ?, ?, ?)', s.merchant, s.cents, s.interval, s.nextDate, s.confirmed ? 1 : 0);

// Today on the device's own calendar. toISOString() would give yesterday every evening in UTC+8.
export function today(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "Not today" on one of Bud's notes. Only today's rows matter; older ones are overwritten or ignored.
export const dismissNudge = (db: SQLiteDatabase, key: string, day: IsoDate) =>
  db.runAsync('INSERT OR REPLACE INTO nudge_dismissals (key, date) VALUES (?, ?)', key, day);
export const dismissedToday = async (db: SQLiteDatabase, day: IsoDate) =>
  new Set((await db.getAllAsync<{ key: string }>('SELECT key FROM nudge_dismissals WHERE date = ?', day)).map((r) => r.key));
