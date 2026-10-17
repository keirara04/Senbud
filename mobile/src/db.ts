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
  // 12: until-payday budgets (Pro). `start` stays the week/month number; these hold the dates.
  `ALTER TABLE budget ADD COLUMN start_date TEXT;
   ALTER TABLE budget ADD COLUMN payday TEXT;`,
  // 13: carry-over (Pro): money added to (+) or taken from (-) the budget period starting on that day.
  `CREATE TABLE carryovers (period_start TEXT PRIMARY KEY, cents INTEGER NOT NULL);`,
  // 14: a category limit's own period (Pro): 'week' (from Monday) or 'month' (from the 1st). NULL follows the budget.
  `ALTER TABLE category_limits ADD COLUMN period TEXT;`,
  // 15: Pro granted from the API's /admin by Support ID, cached so it works offline: when it ends (ISO),
  // '9999' for no end, NULL for none. `pro` stays RevenueCat's alone. Not in backups: a grant is per device.
  `ALTER TABLE app ADD COLUMN pro_until TEXT;`,
  // 16: Bud remembers (Pro, build plan P3.5). Lines the person kept from Bud's "remember this?" slip, at
  // most 20, in backups. And Bud chats on this phone for 30 days, never sent beyond the last 4 turns and
  // not in backups.
  `CREATE TABLE bud_memory (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, created_at TEXT NOT NULL);
   CREATE TABLE bud_chats (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, q TEXT NOT NULL, a TEXT NOT NULL);`,
];

// What a question can send changed on this day (memory lines, and data Bud asks the phone for; consent
// P3.6). A consent from before it doesn't cover that, so the "Bud uses AI" sheet asks once more. Read in
// loadApp, so a backup restoring an older consent is asked again too.
const AI_CONSENT_SINCE = '2026-10-18T00:00:00.000Z';

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
export type Budget = { cents: number; period: BudgetPeriod };
export type Profile = { currency: string; locale: string };
export type Setup = { budget: Budget; rent: Bill | null; profile: Profile };

export async function loadSetup(db: SQLiteDatabase): Promise<Setup | null> {
  const b = await db.getFirstAsync<{ cents: number; kind: BudgetPeriod['kind']; start: number; start_date: string | null; payday: string | null }>('SELECT * FROM budget');
  const p = await db.getFirstAsync<Profile>('SELECT currency, locale FROM profile');
  if (!b || !p) return null;
  const rent = await db.getFirstAsync<{ name: string; cents: number; due_day: number; added_on: string | null }>("SELECT * FROM bills WHERE name = 'Rent' LIMIT 1");
  const period: BudgetPeriod =
    b.kind === 'until' && b.start_date && b.payday
      ? { kind: 'until', start: b.start_date, payday: b.payday }
      : b.kind === 'week'
        ? { kind: 'week', startWeekday: b.start }
        : { kind: 'month', startDay: b.start || 1 };
  return {
    budget: { cents: b.cents, period },
    rent: rent && { name: rent.name, cents: rent.cents, dueDay: rent.due_day, addedOn: rent.added_on ?? undefined },
    profile: p,
  };
}

// Setup owns the Rent bill only; other bills are managed on Budgets. Rent keeps the day it was first added.
export async function saveSetup(db: SQLiteDatabase, { budget, rent, profile }: Setup) {
  const p = budget.period;
  const start = p.kind === 'week' ? p.startWeekday : p.kind === 'month' ? p.startDay : 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO budget (id, cents, kind, start, start_date, payday) VALUES (1, ?, ?, ?, ?, ?)',
      budget.cents, p.kind, start, p.kind === 'until' ? p.start : null, p.kind === 'until' ? p.payday : null,
    );
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
  db.withTransactionAsync(() => db.execAsync(`DELETE FROM transactions; DELETE FROM carryovers; DELETE FROM budget; DELETE FROM bills; DELETE FROM profile; DELETE FROM app; ${NEW_APP_ROW}
    DELETE FROM category_limits; DELETE FROM treats; DELETE FROM treat_jar_history; DELETE FROM ious; DELETE FROM subscriptions; DELETE FROM rules; DELETE FROM nudge_dismissals; DELETE FROM events_queue; DELETE FROM bud_memory; DELETE FROM bud_chats;
    UPDATE treat_jar SET balance_cents = 0, goal_name = NULL, goal_cents = NULL; UPDATE app SET theme = 'dark';`));

// "Back up everything": every user table as rows, plus the app settings. Not nudge_dismissals: they
// only last a day. Not device_id (a new phone
// gets its own) and not pro (the store owns that; Restore purchases brings it back).
const BACKUP_TABLES = ['transactions', 'budget', 'bills', 'profile', 'category_limits', 'treats', 'treat_jar', 'treat_jar_history', 'ious', 'subscriptions', 'rules', 'carryovers', 'bud_memory'];
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
export type AppState = { deviceId: string; aiConsentAt: string | null; pro: boolean; hourlyRateCents: number | null; aiEnabled: boolean; theme: Theme; periodHandled: IsoDate | null; reminders: ReminderKind[]; analytics: boolean; proGranted: boolean };

export async function loadApp(db: SQLiteDatabase): Promise<AppState> {
  const r = await db.getFirstAsync<{ device_id: string; ai_consent_at: string | null; pro: number; hourly_rate_cents: number | null; ai_enabled: number; theme: Theme; period_handled: string | null; reminders: string; analytics: number; pro_until: string | null }>('SELECT * FROM app');
  if (!r) throw new Error('app row missing; migrations did not run');
  const proGranted = r.pro_until !== null && r.pro_until > new Date().toISOString();
  return { deviceId: r.device_id, aiConsentAt: r.ai_consent_at && r.ai_consent_at >= AI_CONSENT_SINCE ? r.ai_consent_at : null, pro: r.pro === 1 || proGranted, proGranted, hourlyRateCents: r.hourly_rate_cents, aiEnabled: r.ai_enabled === 1, theme: r.theme, periodHandled: r.period_handled, reminders: r.reminders ? (r.reminders.split(',') as ReminderKind[]) : [], analytics: r.analytics === 1 };
}

export const giveAiConsent = (db: SQLiteDatabase) => db.runAsync('UPDATE app SET ai_consent_at = ?', new Date().toISOString());
export const setPro = (db: SQLiteDatabase, pro: boolean) => db.runAsync('UPDATE app SET pro = ?', pro ? 1 : 0);
export const setProGrant = (db: SQLiteDatabase, until: string | null) => db.runAsync('UPDATE app SET pro_until = ?', until);
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
export type LimitPeriod = 'week' | 'month' | null;
const limitPeriod = (p: LimitPeriod): BudgetPeriod | undefined => (p === 'week' ? { kind: 'week', startWeekday: 1 } : p === 'month' ? { kind: 'month', startDay: 1 } : undefined);
/** Categories whose limit has its own period, as core periods. */
export async function loadLimitPeriods(db: SQLiteDatabase): Promise<Partial<Record<Category, BudgetPeriod>>> {
  const rows = await db.getAllAsync<{ category: Category; period: LimitPeriod }>('SELECT category, period FROM category_limits WHERE period IS NOT NULL');
  return Object.fromEntries(rows.map((r) => [r.category, limitPeriod(r.period)]));
}
export const loadLimitPeriod = async (db: SQLiteDatabase, category: Category) =>
  (await db.getFirstAsync<{ period: LimitPeriod }>('SELECT period FROM category_limits WHERE category = ?', category))?.period ?? null;
export async function setLimit(db: SQLiteDatabase, category: Category, cents: number | null, period: LimitPeriod = null) {
  await (cents
    ? db.runAsync('INSERT OR REPLACE INTO category_limits (category, cents, period) VALUES (?, ?, ?)', category, cents, period)
    : db.runAsync('DELETE FROM category_limits WHERE category = ?', category));
  track(db, 'limit_set', { category, on: !!cents });
}

export type BillRow = Bill & { id: number };
export async function listBills(db: SQLiteDatabase): Promise<BillRow[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; cents: number; due_day: number; added_on: string | null }>('SELECT * FROM bills ORDER BY due_day, id');
  return rows.map((r) => ({ id: r.id, name: r.name, cents: r.cents, dueDay: r.due_day, addedOn: r.added_on ?? undefined }));
}
export const addBill = (db: SQLiteDatabase, b: Bill) =>
  db.runAsync('INSERT INTO bills (name, cents, due_day, added_on) VALUES (?, ?, ?, ?)', b.name, b.cents, b.dueDay, b.addedOn ?? today());

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

// Delete with Undo for bills and treats: the whole row comes back, id and every column included.
type Undoable = 'bills' | 'treats';
export async function deleteRow(db: SQLiteDatabase, table: Undoable, id: number) {
  const row = await db.getFirstAsync<Row>(`SELECT * FROM ${table} WHERE id = ?`, id);
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
  return row;
}
export async function restoreRow(db: SQLiteDatabase, table: Undoable, row: Row) {
  const keys = Object.keys(row);
  await db.runAsync(`INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, ...keys.map((k) => row[k]));
}

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

// Carry-over: what's been moved into or out of a budget period, keyed by the period's start. A budget
// changed to another period kind starts fresh, since its periods start on other days.
// ponytail: moving an until payday shifts the next period's start, so a borrow from it no longer applies;
// re-key carry-overs in saveSetup if that matters.
export const loadCarry = async (db: SQLiteDatabase, start: IsoDate) =>
  (await db.getFirstAsync<{ cents: number }>('SELECT cents FROM carryovers WHERE period_start = ?', start))?.cents ?? 0;
export const addCarry = (db: SQLiteDatabase, moves: [start: IsoDate, cents: number][]) =>
  db.withTransactionAsync(async () => {
    for (const [start, cents] of moves)
      await db.runAsync('INSERT INTO carryovers (period_start, cents) VALUES (?, ?) ON CONFLICT (period_start) DO UPDATE SET cents = cents + excluded.cents', start, cents);
  });

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

// Bud remembers (Pro). Each line was kept by the person from Bud's slip; newest first.
export type Memory = { id: number; text: string; createdAt: string };
export const MEMORY_MAX = 20;
export const loadMemory = (db: SQLiteDatabase) =>
  db.getAllAsync<Memory>('SELECT id, text, created_at AS createdAt FROM bud_memory ORDER BY id DESC');
/** Keeps a line, dropping the oldest past 20. Returns false for one it already has. */
export async function addMemory(db: SQLiteDatabase, text: string) {
  const line = text.trim().slice(0, 120);
  if (!line || (await db.getFirstAsync('SELECT 1 FROM bud_memory WHERE lower(text) = lower(?)', line))) return false;
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO bud_memory (text, created_at) VALUES (?, ?)', line, new Date().toISOString());
    await db.runAsync('DELETE FROM bud_memory WHERE id NOT IN (SELECT id FROM bud_memory ORDER BY id DESC LIMIT ?)', MEMORY_MAX);
  });
  return true;
}
export const forgetMemory = (db: SQLiteDatabase, id?: number) =>
  id === undefined ? db.runAsync('DELETE FROM bud_memory') : db.runAsync('DELETE FROM bud_memory WHERE id = ?', id);

// Bud chats kept on the phone (Pro): a question and Bud's answer, 30 days, at most 200.
export type Chat = { id: number; at: string; q: string; a: string };
export async function loadChats(db: SQLiteDatabase): Promise<Chat[]> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  await db.runAsync('DELETE FROM bud_chats WHERE at < ? OR id NOT IN (SELECT id FROM bud_chats ORDER BY id DESC LIMIT 200)', since);
  return (await db.getAllAsync<Chat>('SELECT * FROM bud_chats ORDER BY id DESC LIMIT 200')).reverse();
}
export const saveChat = (db: SQLiteDatabase, q: string, a: string) => db.runAsync('INSERT INTO bud_chats (at, q, a) VALUES (?, ?, ?)', new Date().toISOString(), q, a);
export const clearChats = (db: SQLiteDatabase) => db.runAsync('DELETE FROM bud_chats');
