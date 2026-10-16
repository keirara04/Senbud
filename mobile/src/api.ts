// The Senbud API (api/, Laravel). Only receipt reading and Bud's questions talk to it; everything else
// stays on the phone.
import type { Category } from '@senbud/core';

// Simulators reach the dev machine on localhost (Android through `adb reverse tcp:8000 tcp:8000`).
// Real devices and release builds set EXPO_PUBLIC_API_URL.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type Receipt = {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  items: { label: string; amount: number; category: Category }[];
  total: number | null;
};

const MESSAGES: Record<number, string> = {
  422: 'That photo couldn’t be read. Try a clearer one.',
  429: 'That’s a lot of receipts. Try again in a minute.',
  503: 'Receipt reading isn’t available right now.',
};

export async function readReceipt(base64: string, currency: string | undefined, deviceId: string): Promise<Receipt> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 60_000);
  try {
    const res = await fetch(`${API_URL}/v1/agent/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Device-Id': deviceId },
      body: JSON.stringify({ image: base64, currency }),
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(MESSAGES[res.status] ?? 'Couldn’t read that receipt. Try again, or type it instead.');
    return (await res.json()) as Receipt;
  } catch (e) {
    if (e instanceof Error && e.message && !(e.name === 'AbortError' || e.name === 'TypeError')) throw e;
    throw new Error('No connection to Senbud. Check your internet and try again.');
  } finally {
    clearTimeout(timer);
  }
}

// Exactly what the "What gets sent" screen promises: the question, this period's totals, budget and
// rent, and at most the last 20 expenses. Amounts in major units.
export type AskSummary = {
  currency: string;
  summary: {
    period: 'week' | 'month';
    days_left: number;
    budget: number;
    spent: number;
    left: number;
    safe_today: number;
    upcoming_bills: number;
    by_category: Partial<Record<Category, number>>;
    rent: { amount: number; due_day: number } | null;
  };
  expenses: { date: string; label: string; amount: number; category: Category }[];
};

const ASK_MESSAGES: Record<number, string> = {
  429: 'That’s a lot of questions. Try again in a minute.',
  503: 'Questions aren’t available right now. Quick adds still work, like “kopi 4.50”.',
};
// Design system 4.9's offline slip.
const OFFLINE = 'Can’t reach Senbud right now. Anything you add is still saved on your phone.';

export async function askBud(question: string, about: AskSummary, deviceId: string): Promise<string> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 40_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/agent/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Device-Id': deviceId },
      body: JSON.stringify({ question, ...about }),
      signal: abort.signal,
    });
  } catch {
    throw new Error(OFFLINE);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(ASK_MESSAGES[res.status] ?? OFFLINE);
  const { answer } = (await res.json().catch(() => ({}))) as { answer?: unknown };
  if (typeof answer !== 'string' || !answer) throw new Error(OFFLINE);
  return answer;
}
