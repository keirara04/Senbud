// The Senbud API (api/, Laravel). Only receipt reading and Bud's questions talk to it; everything else
// stays on the phone.
import type { Category } from '@senbud/core';
import { Platform } from 'react-native';

// Development: the dev machine on localhost (Android through `adb reverse tcp:8000 tcp:8000`), or
// EXPO_PUBLIC_API_URL for a phone on Wi-Fi. Release builds default to the production API.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:8000' : 'https://api.senbud.com');

// Pro can't be bought on the web yet, so the web app gets a small free allowance a day instead. The API
// enforces the same numbers for requests from the web app (AppServiceProvider::WEB_FREE_*).
export const WEB = Platform.OS === 'web';
export const WEB_FREE = { receipts: 3, questions: 10 };

// The owner's own builds skip the AI limits with a secret the API checks (UNLIMITED_KEY). Anything
// EXPO_PUBLIC_ is bundled into the app, so set it only for personal builds, never a store build.
const UNLIMITED = process.env.EXPO_PUBLIC_UNLIMITED_KEY;
const headers = (deviceId: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Device-Id': deviceId,
  ...(UNLIMITED ? { 'X-Unlimited-Key': UNLIMITED } : {}),
});

// A 429 with a day-sized Retry-After is the web allowance (or a daily cap), not "too fast".
const usedUpToday = (res: Response) => Number(res.headers.get('Retry-After') ?? 0) > 3600;

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
      headers: headers(deviceId),
      body: JSON.stringify({ image: base64, currency }),
      signal: abort.signal,
    });
    if (res.status === 429 && usedUpToday(res))
      throw new Error(WEB ? `That’s today’s ${WEB_FREE.receipts} free receipts on the web. You get more tomorrow, or type it instead.` : 'That’s a lot of receipts for one day. Try again tomorrow, or type it instead.');
    if (!res.ok) throw new Error(MESSAGES[res.status] ?? 'Couldn’t read that receipt. Try again, or type it instead.');
    return (await res.json()) as Receipt;
  } catch (e) {
    // SyntaxError: a 200 that isn't JSON, like a captive portal's login page. Same as no connection.
    if (e instanceof Error && e.message && !(e.name === 'AbortError' || e.name === 'TypeError' || e.name === 'SyntaxError')) throw e;
    throw new Error('No connection to Senbud. Check your internet and try again.');
  } finally {
    clearTimeout(timer);
  }
}

// Exactly what the "What gets sent" screen promises: the question, up to 4 earlier questions and answers
// from the same chat, this period's totals, budget and rent, and at most the last 20 expenses. Amounts in
// major units.
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
  422: 'That question is too long for Bud. Try a shorter one.',
  429: 'That’s a lot of questions. Try again in a minute.',
  503: 'Questions aren’t available right now. Quick adds still work.',
};
// Design system 4.9's offline slip.
const OFFLINE = 'Can’t reach Senbud right now. Anything you add is still saved on your phone.';

// One earlier question and Bud's answer from the same chat, so follow-ups like "and last week?" work.
export type Turn = { q: string; a: string };

// What Bud may offer under an answer. Each one only opens a prefilled screen; the person saves it there.
export type BudAction =
  | { type: 'set_limit'; category: Category; amount: number | null }
  | { type: 'add_bill'; label: string; amount: number }
  | { type: 'open_jar' }
  | { type: 'open_budgets' };

export type BudReply = { answer: string; actions: BudAction[]; offTopic: boolean };

export const COOLDOWN = 'Let’s stick to your money today. Quick adds, “can I afford…” and “how’s my month?” still work.';

export async function askBud(question: string, about: AskSummary, deviceId: string, turns: Turn[] = []): Promise<BudReply> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/agent/ask`, {
      method: 'POST',
      headers: headers(deviceId),
      body: JSON.stringify({ question, turns: turns.slice(-4).map((t) => ({ q: t.q.slice(0, 300), a: t.a.slice(0, 300) })), ...about }),
      signal: abort.signal,
    });
  } catch {
    throw new Error(OFFLINE);
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => ({}))) as { answer?: unknown; actions?: unknown; off_topic?: unknown; error?: unknown };
  if (res.status === 429 && body.error === 'off_topic_cooldown') throw new Error(COOLDOWN);
  if (res.status === 429 && usedUpToday(res))
    throw new Error(WEB ? `That’s today’s ${WEB_FREE.questions} free questions on the web. Ask again tomorrow; quick adds still work.` : 'That’s a lot of questions for one day. Ask again tomorrow; quick adds still work.');
  if (!res.ok) throw new Error(ASK_MESSAGES[res.status] ?? OFFLINE);
  if (typeof body.answer !== 'string' || !body.answer) throw new Error(OFFLINE);
  return { answer: body.answer, actions: Array.isArray(body.actions) ? (body.actions as BudAction[]) : [], offTopic: body.off_topic === true };
}
