// "Import spending (CSV)" (spec 4.1): Senbud's own export, or a bank's statement file. Columns are found by
// their header names; only spending comes in (credits and income are skipped). Pure: the app picks the file.
import { type Category, CATEGORY_NAMES as CATEGORIES, categorize } from "./index";
import type { IsoDate } from "./dates";
import type { Transaction } from "./types";

// RFC 4180-ish: commas (or semicolons, for European exports), quotes with "" inside, CRLF or LF.
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, "");
  const firstLine = body.slice(0, body.indexOf("\n") >>> 0);
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && body[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim()));
}

// "RM 1,234.50", "-12.00", "(12.00)", "12,50" (decimal comma) -> major units, negative for money out of
// a signed column. NaN when it isn't a number.
export function parseAmount(raw: string): number {
  let s = raw.trim().replace(/[^\d.,()+-]/g, "");
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()+-]/g, "");
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = s ? Number(s) : NaN;
  return negative ? -n : n;
}

// "2026-10-03", "03/10/2026" or "10/03/2026" (dayFirst decides), "3.10.26". null if it isn't a date.
export function parseDate(raw: string, dayFirst: boolean): IsoDate | null {
  const s = raw.trim().slice(0, 10);
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const other = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (other) {
    const [a, b] = [Number(other[1]), Number(other[2])];
    [d, m] = dayFirst ? [a, b] : [b, a];
    y = Number(other[3]) < 100 ? 2000 + Number(other[3]) : Number(other[3]);
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

const find = (header: string[], re: RegExp) => header.findIndex((h) => re.test(h.trim().toLowerCase()));

export type CsvImport = { rows: Transaction[]; skipped: number; duplicates: number; error?: "no-columns" };

/**
 * Spending rows from a CSV. `dayFirst` is the fallback for dates like 03/04/2026 when the file itself
 * doesn't settle it (a day over 12 does). Rows already in `existing` (same date, amount and label) are
 * dropped, so importing the same statement twice adds nothing.
 */
export function fromCsv(text: string, opts: { dayFirst: boolean; existing?: Transaction[] }): CsvImport {
  const [header = [], ...lines] = parseCsv(text);
  const col = {
    date: find(header, /^(date|posted|posting date|transaction date|trans\.? date|value date)$|date/),
    label: find(header, /^(label|description|details|merchant|narrative|payee|name|memo|particulars|transaction)$|desc/),
    amount: find(header, /^(amount|value|sum|amount \(.*\))$|amount/),
    debit: find(header, /^(debit|withdrawal|withdrawals|money out|paid out|out)$|debit|withdraw/),
    category: find(header, /^category$/),
  };
  if (col.date < 0 || col.label < 0 || (col.amount < 0 && col.debit < 0)) return { rows: [], skipped: lines.length, duplicates: 0, error: "no-columns" };

  // A day over 12 in the first or second place settles the date order for the whole file.
  const firstParts = lines.map((l) => (l[col.date] ?? "").trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]/)).filter(Boolean) as RegExpMatchArray[];
  const dayFirst = firstParts.some((p) => Number(p[1]) > 12) ? true : firstParts.some((p) => Number(p[2]) > 12) ? false : opts.dayFirst;

  // A signed amount column: with both signs present, negatives are spending and positives are income.
  const signed = col.debit < 0 && lines.some((l) => parseAmount(l[col.amount] ?? "") < 0);
  const seen = new Set((opts.existing ?? []).map((t) => `${t.date}|${t.cents}|${t.label.trim().toLowerCase()}`));
  const rows: Transaction[] = [];
  let skipped = 0;
  let duplicates = 0;
  for (const l of lines) {
    const date = parseDate(l[col.date] ?? "", dayFirst);
    const label = (l[col.label] ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const raw = col.debit >= 0 && (l[col.debit] ?? "").trim() ? parseAmount(l[col.debit]) : col.amount >= 0 ? parseAmount(l[col.amount] ?? "") : NaN;
    const amount = signed ? -raw : Math.abs(raw);
    const cents = Math.round(amount * 100);
    if (!date || !label || !(cents > 0)) {
      skipped++;
      continue;
    }
    const key = `${date}|${cents}|${label.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    const given = (l[col.category] ?? "").trim() as Category;
    rows.push({ date, cents, label, category: CATEGORIES.includes(given) ? given : categorize(label), source: "csv" });
  }
  return { rows, skipped, duplicates };
}
