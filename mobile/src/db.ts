// Local storage: one SQLite file, plain SQL, numbered migrations. All money is integer cents.
import type { Bill, BudgetPeriod, Category, IsoDate, Transaction } from '@senbud/core';
import type { SQLiteDatabase } from 'expo-sqlite';

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
  const rent = await db.getFirstAsync<{ name: string; cents: number; due_day: number }>('SELECT * FROM bills ORDER BY id LIMIT 1');
  const period = b.kind === 'week' ? { kind: 'week' as const, startWeekday: b.start } : { kind: 'month' as const, startDay: b.start };
  return {
    budget: { cents: b.cents, period },
    rent: rent && { name: rent.name, cents: rent.cents, dueDay: rent.due_day },
    profile: p,
  };
}

// ponytail: one bill (rent) until the Budgets screen manages a list.
export async function saveSetup(db: SQLiteDatabase, { budget, rent, profile }: Setup) {
  const start = budget.period.kind === 'week' ? budget.period.startWeekday : budget.period.startDay;
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR REPLACE INTO budget (id, cents, kind, start) VALUES (1, ?, ?, ?)', budget.cents, budget.period.kind, start);
    await db.runAsync('INSERT OR REPLACE INTO profile (id, currency, locale) VALUES (1, ?, ?)', profile.currency, profile.locale);
    await db.runAsync('DELETE FROM bills');
    if (rent) await db.runAsync('INSERT INTO bills (name, cents, due_day) VALUES (?, ?, ?)', rent.name, rent.cents, rent.dueDay);
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

// "Erase all data": every row gone, schema kept.
export const eraseAll = (db: SQLiteDatabase) =>
  db.execAsync('DELETE FROM transactions; DELETE FROM budget; DELETE FROM bills; DELETE FROM profile;');

// Today on the device's own calendar. toISOString() would give yesterday every evening in UTC+8.
export function today(): IsoDate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
