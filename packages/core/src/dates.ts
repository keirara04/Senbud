// Date-only maths on "YYYY-MM-DD" strings, in UTC so the device time zone never shifts a day.
// Callers pass "today" in; nothing here reads the clock.

export type IsoDate = string;

const DAY = 86_400_000;

const toDays = (iso: IsoDate) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};

const fromDays = (n: number): IsoDate => new Date(n * DAY).toISOString().slice(0, 10);

export const addDays = (iso: IsoDate, n: number) => fromDays(toDays(iso) + n);

// b − a in whole days.
export const daysBetween = (a: IsoDate, b: IsoDate) => toDays(b) - toDays(a);

export const dayOfMonth = (iso: IsoDate) => Number(iso.slice(8, 10));

// 0 = Sunday … 6 = Saturday.
export const weekday = (iso: IsoDate) => new Date(toDays(iso) * DAY).getUTCDay();

// Day `day` of month `m` (0-based, may overflow into other years), clamped to the month's length.
const clampedDate = (y: number, m: number, day: number): IsoDate => {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return fromDays(Date.UTC(y, m, Math.min(day, last)) / DAY);
};

const ym = (iso: IsoDate) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1];

// Same day `n` months later, clamped: Jan 31 + 1 month = Feb 28 (or 29).
export function addMonths(iso: IsoDate, n: number): IsoDate {
  const [y, m] = ym(iso);
  return clampedDate(y, m + n, dayOfMonth(iso));
}

// Next date on or after `from` that falls on `dueDay` (1–31), clamped to short months.
// A bill due on the 31st is due Feb 28, Apr 30, and so on.
export function nextDueDate(dueDay: number, from: IsoDate): IsoDate {
  const [y, m] = ym(from);
  const thisMonth = clampedDate(y, m, dueDay);
  return thisMonth >= from ? thisMonth : clampedDate(y, m + 1, dueDay);
}

// Most recent date on or before `on` that falls on `day` (1–31), clamped to short months.
export function prevDueDate(day: number, on: IsoDate): IsoDate {
  const [y, m] = ym(on);
  const thisMonth = clampedDate(y, m, day);
  return thisMonth <= on ? thisMonth : clampedDate(y, m - 1, day);
}
