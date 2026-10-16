// Local storage: one SQLite file, plain SQL, numbered migrations. All money is integer cents.
import type { Bill, BudgetPeriod, Category, Iou, IsoDate, Subscription, Transaction, Treat } from '@senbud/core';
import type { SQLiteDatabase } from 'expo-sqlite';

// A random v4 UUID from SQLite's own CSPRNG, so no native crypto module is needed.
const NEW_APP_ROW = `INSERT INTO app (id, device_id) VALUES (1,
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', 1 + abs(random()) % 4, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))));`;

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
  const rent = await db.getFirstAsync<{ name: string; cents: number; due_day: number }>("SELECT * FROM bills WHERE name = 'Rent' LIMIT 1");
  const period = b.kind === 'week' ? { kind: 'week' as const, startWeekday: b.start } : { kind: 'month' as const, startDay: b.start };
  return {
    budget: { cents: b.cents, period },
    rent: rent && { name: rent.name, cents: rent.cents, dueDay: rent.due_day },
    profile: p,
  };
}

// Setup owns the Rent bill only; other bills are managed on Budgets.
export async function saveSetup(db: SQLiteDatabase, { budget, rent, profile }: Setup) {
  const start = budget.period.kind === 'week' ? budget.period.startWeekday : budget.period.startDay;
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR REPLACE INTO budget (id, cents, kind, start) VALUES (1, ?, ?, ?)', budget.cents, budget.period.kind, start);
    await db.runAsync('INSERT OR REPLACE INTO profile (id, currency, locale) VALUES (1, ?, ?)', profile.currency, profile.locale);
    await db.runAsync("DELETE FROM bills WHERE name = 'Rent'");
    if (rent) await db.runAsync('INSERT INTO bills (name, cents, due_day) VALUES (?, ?, ?)', 'Rent', rent.cents, rent.dueDay);
  });
}

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
  return ids;
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
  db.execAsync(`DELETE FROM transactions; DELETE FROM budget; DELETE FROM bills; DELETE FROM profile; DELETE FROM app; ${NEW_APP_ROW}
    DELETE FROM category_limits; DELETE FROM treats; DELETE FROM treat_jar_history; DELETE FROM ious; DELETE FROM subscriptions; DELETE FROM rules;
    UPDATE treat_jar SET balance_cents = 0, goal_name = NULL, goal_cents = NULL;`);

export type Theme = 'system' | 'light' | 'dark';
export type AppState = { deviceId: string; aiConsentAt: string | null; pro: boolean; hourlyRateCents: number | null; aiEnabled: boolean; theme: Theme };

export async function loadApp(db: SQLiteDatabase): Promise<AppState> {
  const r = await db.getFirstAsync<{ device_id: string; ai_consent_at: string | null; pro: number; hourly_rate_cents: number | null; ai_enabled: number; theme: Theme }>('SELECT * FROM app');
  if (!r) throw new Error('app row missing; migrations did not run');
  return { deviceId: r.device_id, aiConsentAt: r.ai_consent_at, pro: r.pro === 1, hourlyRateCents: r.hourly_rate_cents, aiEnabled: r.ai_enabled === 1, theme: r.theme };
}

export const giveAiConsent = (db: SQLiteDatabase) => db.runAsync('UPDATE app SET ai_consent_at = ?', new Date().toISOString());
export const setPro = (db: SQLiteDatabase, pro: boolean) => db.runAsync('UPDATE app SET pro = ?', pro ? 1 : 0);
export const setHourlyRate = (db: SQLiteDatabase, cents: number | null) => db.runAsync('UPDATE app SET hourly_rate_cents = ?', cents);
export const setAiEnabled = (db: SQLiteDatabase, on: boolean) => db.runAsync('UPDATE app SET ai_enabled = ?', on ? 1 : 0);
export const setTheme = (db: SQLiteDatabase, theme: Theme) => db.runAsync('UPDATE app SET theme = ?', theme);

// Budgets: category limits and bills.
export async function loadLimits(db: SQLiteDatabase): Promise<Partial<Record<Category, number>>> {
  const rows = await db.getAllAsync<{ category: Category; cents: number }>('SELECT * FROM category_limits');
  return Object.fromEntries(rows.map((r) => [r.category, r.cents]));
}
export const setLimit = (db: SQLiteDatabase, category: Category, cents: number | null) =>
  cents ? db.runAsync('INSERT OR REPLACE INTO category_limits (category, cents) VALUES (?, ?)', category, cents) : db.runAsync('DELETE FROM category_limits WHERE category = ?', category);

export type BillRow = Bill & { id: number };
export async function listBills(db: SQLiteDatabase): Promise<BillRow[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; cents: number; due_day: number }>('SELECT * FROM bills ORDER BY due_day, id');
  return rows.map((r) => ({ id: r.id, name: r.name, cents: r.cents, dueDay: r.due_day }));
}
export const addBill = (db: SQLiteDatabase, b: Bill) => db.runAsync('INSERT INTO bills (name, cents, due_day) VALUES (?, ?, ?)', b.name, b.cents, b.dueDay);
export const deleteBill = (db: SQLiteDatabase, id: number) => db.runAsync('DELETE FROM bills WHERE id = ?', id);

// Treats and the jar.
export type TreatRow = Treat & { id: number };
export async function listTreats(db: SQLiteDatabase): Promise<TreatRow[]> {
  const rows = await db.getAllAsync<{ id: number; name: string; last_cents: number; last_date: string | null; min_days: number }>('SELECT * FROM treats ORDER BY name');
  return rows.map((r) => ({ id: r.id, name: r.name, lastCents: r.last_cents, lastDate: r.last_date ?? undefined, minDaysBetween: r.min_days }));
}
export const addTreat = (db: SQLiteDatabase, t: Treat) =>
  db.runAsync('INSERT INTO treats (name, last_cents, last_date, min_days) VALUES (?, ?, ?, ?)', t.name, t.lastCents, t.lastDate ?? null, t.minDaysBetween);
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
export const setFriendPaid = (db: SQLiteDatabase, friend: string, paid: boolean) =>
  db.runAsync('UPDATE ious SET paid = ? WHERE friend = ? AND paid = ?', paid ? 1 : 0, friend, paid ? 0 : 1);

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
