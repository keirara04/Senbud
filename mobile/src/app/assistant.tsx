// Bud, the assistant (design system 4.9). Rules in core (readIntent) answer on the phone; only a question
// in your own words goes to the API, with the summary "What gets sent" promises. Bud prints every answer
// as a receipt slip.
import { addDays, afford, billCountdown, type BudgetPeriod, type Category, categoryNamed, compareToLast, daysBetween, hoursOfWork, nudgeKey, periodRange, readIntent, spentIn, type Transaction } from '@senbud/core';
import { palette, radius, space, touch } from '@senbud/core/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Bud, type BudFace, ReceiptCard } from '@/art';
import { askBud, type AskSummary, type BudAction, COOLDOWN, type Turn, WEB } from '@/api';
import { askAiConsent } from '@/consent';
import { drinkExample, quickAddExample, typed } from '@/currencies';
import { type AppState, addTransactions, type Budget, deleteTransactions, listTransactions, loadApp, loadLimitPeriod, loadLimits, loadSetup, saveSetup, setLimit } from '@/db';
import { useMoney } from '@/money';
import { budgetOf, periodWord, perPeriod } from '@/onboarding';
import { usePro } from '@/purchases';
import { NoteCard, useBudNotes } from '@/notes';
import { Button, CATEGORIES, Icon, Marker, noWebOutline, ReceiptLine, T, TextButton, useTheme } from '@/ui';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Line = [label: string, value: string];
// `ai` marks an answer the model wrote, so the slip says to check its numbers.
type Slip = { face: BudFace; title: string; lines?: Line[]; total?: Line; note?: string; ai?: boolean; actions?: ReactNode; printing?: boolean };
type Msg = { id: number; me: string } | { id: number; slip: Slip };

// A starter chip: title, hint, and either a question Bud answers straight away (send) or text it puts in
// the box to finish.
type Starter = { title: string; hint: string; text: string; send: boolean };

export default function Assistant() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m, reload } = useMoney();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [app, setApp] = useState<AppState | null>(null);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const nextId = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const askedQ = useRef(false);
  // Earlier questions and answers in this chat, sent along so follow-ups work. Never saved.
  const turns = useRef<Turn[]>([]);
  const viewH = useRef(0);
  const { notes, dismiss } = useBudNotes(m);
  const pro = usePro();

  useEffect(() => {
    loadApp(db).then(setApp);
  }, [db]);

  // A question typed into Home's capture bar arrives as ?q=.
  useEffect(() => {
    if (q && m && app && !askedQ.current) {
      askedQ.current = true;
      send(q);
    }
  });

  if (!m || !app) return null;
  const { setup, safe, fmt, day, txns, limit } = m;
  const unit = periodWord(setup.budget.period);

  const newId = () => nextId.current++;
  const add = (...more: Msg[]) => setMsgs((cur) => [...cur, ...more]);
  const replace = (id: number, slip: Slip) => setMsgs((cur) => cur.map((x) => (x.id === id ? { id, slip } : x)));

  function affordSlip(id: number, cents: number, label: string): Slip {
    const periodDays = daysBetween(safe.start, safe.nextStart);
    const r = afford(cents, { left: safe.left, daysLeft: safe.daysLeft, weeklyBudget: (setup.budget.cents / periodDays) * 7 });
    const lastDay = new Date(`${addDays(safe.nextStart, -1)}T12:00:00Z`).toLocaleDateString(setup.profile.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const hours = app!.hourlyRateCents ? ` · ${hoursOfWork(cents, app!.hourlyRateCents)} hrs of work` : '';
    const words =
      r.verdict === 'yes'
        ? { face: 'yay' as const, head: 'Yes.', note: `${fmt(Math.floor(r.perDayAfter))} a day after, till ${lastDay}. Rent still covered${hours}.` }
        : r.verdict === 'tight'
          ? { face: 'thinking' as const, head: 'Doable, but tight.', note: `${fmt(Math.floor(r.perDayAfter))} a day after, down from ${fmt(safe.perDay)}${hours}.` }
          : { face: 'oops' as const, head: `Not this ${unit}.`, note: `It’s more than what’s safe to spend before ${lastDay}${hours}.` };
    return {
      face: words.face,
      title: 'Can I afford it?',
      lines: [[label || 'This', fmt(cents)]],
      total: ['', words.head],
      note: words.note,
      actions:
        r.verdict !== 'no' ? (
          <TextButton
            title="I bought it"
            onPress={async () => {
              await addTransactions(db, [{ date: day, cents, label: label || 'Purchase', category: 'Other', source: 'bud' }]);
              reload();
              // Once only: drop the button so more taps can't add it again.
              setMsgs((cur) => cur.map((x) => (x.id === id && 'slip' in x ? { id, slip: { ...x.slip, actions: undefined } } : x)));
              add({ id: newId(), slip: { face: 'happy', title: 'Added', lines: [[label || 'Purchase', fmt(cents)]] } });
            }}
          />
        ) : null,
    };
  }

  function monthSlip(): Slip {
    const lines = CATEGORIES.map((c) => [c, spentIn(txns.filter((x) => x.category === c), safe)] as const)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([c, cents]): Line => [c, fmt(cents)]);
    return {
      face: safe.left > 0 ? 'happy' : 'oops',
      title: `Your ${unit}`,
      lines: lines.length ? lines : [['Nothing yet', fmt(0)]],
      total: ['Left', fmt(Math.max(0, safe.left))],
      note: `${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'} to go. Safe today: ${fmt(safe.perDay)}.`,
    };
  }

  // Chips follow the state: a bill due soon, a low day, the top category, then the usual four.
  function starters(): Starter[] {
    const periodDays = daysBetween(safe.start, safe.nextStart);
    const soon = m!.bills.map((b) => ({ b, ...billCountdown(b, day) })).find((x) => x.days <= 3);
    const top = CATEGORIES.map((c) => [c, spentIn(txns.filter((x) => x.category === c), safe)] as const).sort((a, b) => b[1] - a[1])[0];
    const chips: Starter[] = [];
    if (soon) chips.push({ title: 'Next bill?', hint: `${soon.b.name} is due soon`, text: 'When’s the next bill?', send: true });
    if (safe.perDay * periodDays < setup.budget.cents / 2) chips.push({ title: `Can I afford ${typed(20, setup.profile.currency)}?`, hint: 'Today’s a tight one', text: `Can I afford ${typed(20, setup.profile.currency)}?`, send: true });
    if (top && top[1] > 0) chips.push({ title: `How much on ${top[0].toLowerCase()}?`, hint: `This ${unit} so far`, text: `How much on ${top[0].toLowerCase()}?`, send: true });
    // Two state chips at most, so "How's my month?" always has a place.
    chips.splice(2);
    chips.push(
      { title: 'Can I afford…', hint: 'Check a price before you pay', text: 'Can I afford ', send: false },
      { title: `How’s my ${unit}?`, hint: 'Where it went, what’s left', text: `How’s my ${unit}?`, send: true },
      { title: 'Split a bill', hint: 'Who owes you what', text: 'Split ', send: false },
      { title: 'Add a few things', hint: `“${quickAddExample(setup.profile.currency)}”`, text: '', send: false },
    );
    return chips.filter((c, i) => chips.findIndex((x) => x.title === c.title) === i).slice(0, 4);
  }

  const short = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(setup.profile.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  // "how much on food" or "kat makan": a category by name, else anything whose label has the words in it.
  function spentOnSlip(query: string): Slip {
    const q = query.toLowerCase();
    const category = categoryNamed(q);
    const found = txns.filter((x) => (category ? x.category === category : x.label.toLowerCase().includes(q)));
    const total = found.reduce((sum, x) => sum + x.cents, 0);
    const title = `Spent on ${category ?? query}`;
    if (!found.length) return { face: 'happy', title, note: `Nothing on ${category?.toLowerCase() ?? query} this ${unit} yet.` };
    return {
      face: 'happy',
      title,
      lines: found.slice(0, 5).map((x): Line => [`${x.label} · ${short(x.date)}`, fmt(x.cents)]),
      total: ['Total', fmt(total)],
      note: `${found.length} ${found.length === 1 ? 'buy' : 'buys'} this ${unit}${found.length > 5 ? ', newest 5 shown' : ''}.`,
    };
  }

  function biggestSlip(): Slip {
    const top = [...txns].sort((a, b) => b.cents - a.cents).slice(0, 3);
    if (!top.length) return { face: 'happy', title: 'Biggest spends', note: `Nothing spent this ${unit} yet.` };
    return { face: 'thinking', title: 'Biggest spends', lines: top.map((x): Line => [`${x.label} · ${short(x.date)}`, fmt(x.cents)]), note: `${top[0].label} is the biggest this ${unit}.` };
  }

  function billsSlip(): Slip {
    const due = m!.bills.map((b) => ({ b, ...billCountdown(b, day) })).sort((a, b) => a.days - b.days);
    if (!due.length)
      return { face: 'thinking', title: 'Coming up', note: 'No bills set yet. Add rent or a phone plan in Budgets.', actions: <TextButton title="See Budgets" onPress={() => router.navigate('/budgets')} /> };
    return {
      face: safe.covered ? 'happy' : 'oops',
      title: 'Coming up',
      lines: due.map(({ b, days }): Line => [`${b.name} · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`, fmt(b.cents)]),
      note: safe.covered ? 'All covered by what’s left.' : `Once these are paid you’re ${fmt(-safe.left)} short. Hold off on treats for now.`,
    };
  }

  async function compareSlip(id: number) {
    const last = periodRange(setup.budget.period, addDays(safe.start, -1));
    const c = compareToLast(await listTransactions(db, last.start), setup.budget.period, day);
    const diff = c.now - c.thenByNow;
    replace(id, {
      face: diff <= 0 ? 'happy' : 'thinking',
      title: `This ${unit} vs last`,
      lines: [
        [`This ${unit}, day ${c.day}`, fmt(c.now)],
        [`Last ${unit} by day ${c.day}`, fmt(c.thenByNow)],
      ],
      total: [`Last ${unit} in all`, fmt(c.thenTotal)],
      note: !c.thenTotal ? `Nothing saved for last ${unit} to compare with.` : diff < 0 ? `${fmt(-diff)} less than this point last ${unit}.` : diff > 0 ? `${fmt(diff)} more than this point last ${unit}.` : `Same as this point last ${unit}.`,
    });
  }

  // "I only want to spend 100 this week" (spec 4.2): Bud shows the change and saves nothing until Set it.
  async function budgetSlip(id: number, cents: number, period: 'week' | 'month' | 'until' | undefined, category: Category | undefined) {
    const keep = (title: string, note: string) => replace(id, { face: 'happy', title, note });
    if (!cents) return replace(id, { face: 'thinking', title: 'Your budget', note: 'Tell me the amount, like “I only want to spend 100 this week”.', actions: <TextButton title="Open Budget" onPress={() => router.push('/edit-budget')} /> });
    const actions = (title: string, onSet: () => Promise<void>) => (
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Keep it" variant="secondary" onPress={() => keep(title, 'Okay, nothing changed.')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Set it" onPress={onSet} />
        </View>
      </View>
    );

    if (category) {
      // Its own week or month is Pro; otherwise it resets with the budget.
      const asked = period && period !== 'until' && period !== setup.budget.period.kind ? period : null;
      const own = pro ? asked : null;
      const [old, oldOwn] = [(await loadLimits(db))[category], await loadLimitPeriod(db, category)];
      const per = (p: string | null) => (p ? `a ${p}` : perPeriod(setup.budget.period, setup.profile.locale));
      const lines: Line[] = [['Now', old ? `${fmt(old)} ${per(oldOwn)}` : 'No limit'], ['New', `${fmt(cents)} ${per(own)}`]];
      return replace(id, {
        face: 'thinking',
        title: `${category} limit`,
        lines,
        note: asked && !own ? `It resets with your budget. Its own ${asked} comes with Senbud Pro.` : undefined,
        actions: actions(`${category} limit`, async () => {
          await setLimit(db, category, cents, own);
          reload();
          replace(id, {
            face: 'yay',
            title: `${category} limit set`,
            lines: [['New', `${fmt(cents)} ${per(own)}`]],
            actions: (
              <TextButton
                title="Undo"
                onPress={async () => {
                  await setLimit(db, category, old ?? null, oldOwn);
                  reload();
                  replace(id, { face: 'happy', title: `${category} limit`, lines: lines.slice(0, 1), note: 'Back to how it was.' });
                }}
              />
            ),
          });
        }),
      });
    }

    const now = setup.budget;
    if (period === 'until' && !pro)
      return replace(id, { face: 'happy', title: 'Until payday', note: 'A budget that runs until payday comes with Senbud Pro. A week or a month stays free.', actions: <Button title="See plans" variant="secondary" onPress={() => router.push('/pro')} /> });
    // Until payday needs the date, which the Budget sheet asks for.
    if (period === 'until' && now.period.kind !== 'until')
      return replace(id, { face: 'thinking', title: 'Until payday', note: `Pick your payday and I’ll set ${fmt(cents)} until then.`, actions: <Button title="Pick a payday" variant="secondary" onPress={() => router.push('/edit-budget')} /> });
    const next: Budget = !period || period === now.period.kind ? { cents, period: now.period } : budgetOf(period as 'week' | 'month', cents);
    const say = (b: { cents: number; period: BudgetPeriod }) => `${fmt(b.cents)} ${perPeriod(b.period, setup.profile.locale)}`;
    if (next.cents === now.cents && next.period.kind === now.period.kind) return keep('Your budget', `${say(now)} is already your budget.`);
    const lines: Line[] = [['Now', say(now)], ['New', say(next)]];
    // Same period: what's left moves by the difference. A new period starts counting from today's.
    const note = next.period.kind === now.period.kind ? `That leaves ${fmt(Math.max(0, safe.left + cents - now.cents))} for the rest of this ${unit}.` : `It counts from the start of this ${next.period.kind}.`;
    replace(id, {
      face: 'thinking',
      title: 'New budget?',
      lines,
      note,
      actions: actions('Your budget', async () => {
        const fresh = await loadSetup(db);
        if (!fresh) return;
        await saveSetup(db, { ...fresh, budget: next });
        reload();
        replace(id, {
          face: 'yay',
          title: 'Budget set',
          lines: [['New', say(next)]],
          actions: (
            <TextButton
              title="Undo"
              onPress={async () => {
                await saveSetup(db, { ...fresh, budget: fresh.budget });
                reload();
                replace(id, { face: 'happy', title: 'Your budget', lines: lines.slice(0, 1), note: 'Back to how it was.' });
              }}
            />
          ),
        });
      }),
    });
  }

  async function addSlip(id: number, rows: Transaction[]) {
    const ids = await addTransactions(db, rows);
    reload();
    const lines = rows.map((r): Line => [r.label, fmt(r.cents)]);
    const total: Line = ['Today', fmt(rows.reduce((s, r) => s + r.cents, 0))];
    replace(id, {
      face: 'happy',
      title: 'Added',
      lines,
      total,
      actions: (
        <TextButton
          title="Undo"
          onPress={async () => {
            await deleteTransactions(db, ids);
            reload();
            replace(id, { face: 'happy', title: 'Undone', lines, total, note: 'Nothing was saved.' });
          }}
        />
      ),
    });
  }

  function send(raw: string) {
    const line = raw.trim();
    if (!line) return;
    setText('');
    const intent = readIntent(line, m?.setup.profile.currency);
    const id = newId();
    add({ id: newId(), me: line }, { id, slip: { face: 'thinking', title: 'Bud', printing: true } });

    if (intent.kind === 'afford')
      return replace(id, intent.amount ? affordSlip(id, Math.round(intent.amount * 100), intent.label) : { face: 'thinking', title: 'Can I afford it?', note: 'Tell me the price, like “can I afford 45”.' });
    if (intent.kind === 'month') return replace(id, monthSlip());
    if (intent.kind === 'spentOn') return replace(id, spentOnSlip(intent.query));
    if (intent.kind === 'biggest') return replace(id, biggestSlip());
    if (intent.kind === 'bills') return replace(id, billsSlip());
    if (intent.kind === 'daysLeft')
      return replace(id, { face: 'happy', title: 'Days left', note: `${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'} left this ${unit}. Safe to spend: ${fmt(safe.perDay)} a day.` });
    if (intent.kind === 'compare') return void compareSlip(id);
    if (intent.kind === 'budget') return void budgetSlip(id, intent.amount ? Math.round(intent.amount * 100) : 0, intent.period, intent.category);
    if (intent.kind === 'add')
      return addSlip(id, intent.items.map((i) => ({ date: day, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'bud' })));
    if (intent.kind === 'split') {
      const cents = intent.amount ? Math.round(intent.amount * 100) : 0;
      const { people, label } = intent;
      const share = cents && people.length ? Math.floor(cents / (people.length + 1)) : 0;
      return replace(id, {
        face: 'thinking',
        title: 'Split this?',
        lines: cents ? [[label || 'Bill', fmt(cents)], ...(share ? [['You', fmt(cents - share * people.length)] as Line, ...people.map((p): Line => [`${p} owes you`, fmt(share)])] : [])] : undefined,
        note: cents ? undefined : 'Tell me the amount and who, like “dinner 60 split with Aiman”.',
        actions: (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {cents ? (
              <View style={{ flex: 1 }}>
                <Button title="Just mine" variant="secondary" onPress={() => addSlip(id, [{ date: day, cents, label: label || 'Bill', category: 'Food', source: 'bud' }])} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                title={cents ? 'Yes, split it' : 'Open Split'}
                onPress={() => router.push({ pathname: '/split', params: { amount: cents ? String(cents / 100) : '', merchant: label, people: people.join(',') } })}
              />
            </View>
          </View>
        ),
      });
    }
    return ask(line, id);
  }

  // Only this period's numbers and its last 20 expenses (txns is this period, newest first).
  function summary(): AskSummary {
    const major = (cents: number) => cents / 100;
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, major(spentIn(txns.filter((x) => x.category === c), safe))]).filter(([, v]) => v));
    return {
      currency: setup.profile.currency,
      summary: {
        period: setup.budget.period.kind,
        days_left: safe.daysLeft,
        budget: major(limit),
        spent: major(safe.spent),
        left: major(safe.left),
        safe_today: major(safe.perDay),
        upcoming_bills: major(safe.upcoming),
        by_category: byCategory,
        rent: setup.rent && { amount: major(setup.rent.cents), due_day: setup.rent.dueDay },
      },
      expenses: txns.slice(0, 20).map((x) => ({ date: x.date, label: x.label.slice(0, 60), amount: major(x.cents), category: x.category })),
    };
  }

  // Bud's suggestions open a prefilled screen; nothing changes until the person saves it there.
  function actionButton(a: BudAction, i: number) {
    const go = (path: string, params: Record<string, string> = {}) => () => {
      const query = new URLSearchParams(params).toString();
      router.push((query ? `${path}?${query}` : path) as never);
    };
    if (a.type === 'set_limit' && CATEGORIES.includes(a.category))
      return <Button key={i} variant="secondary" title={`Set a ${a.category} limit${a.amount ? ` of ${fmt(Math.round(a.amount * 100))}` : ''}`} onPress={go('/limit', { category: a.category, ...(a.amount ? { amount: String(a.amount) } : {}) })} />;
    if (a.type === 'add_bill' && a.label && a.amount > 0)
      return <Button key={i} variant="secondary" title={`Add ${a.label} as a bill`} onPress={go('/bill', { name: a.label, amount: String(a.amount) })} />;
    if (a.type === 'open_jar') return <Button key={i} variant="secondary" title="Open the treat jar" onPress={go('/jar')} />;
    if (a.type === 'open_budgets') return <Button key={i} variant="secondary" title="See Budgets" onPress={() => router.navigate('/budgets')} />;
    return null;
  }

  // A question in your own words. Same gates as receipts, read fresh so a purchase or a Settings change
  // made since the sheet opened counts.
  async function ask(line: string, id: number) {
    const a = await loadApp(db);
    setApp(a);
    if (!a.aiEnabled)
      return replace(id, {
        face: 'oops',
        title: 'AI is off',
        note: `AI is off, so I can’t answer questions. Quick adds still work, like “${drinkExample(m?.setup.profile.currency)}”.`,
        actions: <Button title="Turn on AI in Settings" variant="secondary" onPress={() => router.navigate('/settings')} />,
      });
    // On the web there's no Pro to buy yet: a few free questions a day instead (the API counts them).
    if (!a.pro && !WEB)
      return replace(id, {
        face: 'happy',
        title: 'Senbud Pro',
        note: `Questions in your own words come with Senbud Pro. “How’s my ${unit}?”, “can I afford 45” and quick adds stay free.`,
        actions: <Button title="See plans" variant="secondary" onPress={() => router.push('/pro')} />,
      });
    // First AI use: the one "Bud uses AI" sheet. Not now leaves the question unanswered.
    if (!a.aiConsentAt && !(await askAiConsent()))
      return replace(id, {
        face: 'thinking',
        title: 'Bud',
        note: 'Okay, no AI. Quick adds and “How’s my ' + unit + '?” still work without it.',
        actions: <Button title="Ask with AI" variant="secondary" onPress={() => ask(line, id)} />,
      });
    replace(id, { face: 'thinking', title: 'Bud', printing: true });
    try {
      const r = await askBud(line, summary(), a.deviceId, turns.current);
      if (r.offTopic)
        return replace(id, {
          face: 'thinking',
          title: 'Bud',
          note: r.answer,
          actions: (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              <TextButton title={`How’s my ${unit}?`} onPress={() => send(`How’s my ${unit}?`)} />
              <TextButton title="Can I afford 20?" onPress={() => send('Can I afford 20?')} />
            </View>
          ),
        });
      turns.current = [...turns.current, { q: line, a: r.answer }].slice(-4);
      const buttons = r.actions.map(actionButton).filter((b) => b !== null);
      replace(id, { face: 'happy', title: 'Bud', note: r.answer, ai: true, actions: buttons.length ? <View style={{ gap: space.xs }}>{buttons}</View> : undefined });
    } catch (e) {
      const note = e instanceof Error ? e.message : String(e);
      // No "Try again" when questions are paused for the day: it can't work until tomorrow.
      replace(id, { face: 'oops', title: 'Bud', note, actions: note === COOLDOWN ? undefined : <TextButton title="Try again" onPress={() => ask(line, id)} /> });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.md, gap: space.md }}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
        // Only once the slips outgrow the view: scrolling short content "to the end" tucks it under the header.
        onContentSizeChange={(_, h) => h > viewH.current && scroll.current?.scrollToEnd({ animated: true })}
      >
        {!msgs.length ? (
          <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.md }}>
            <Bud size={96} />
            <T variant="title">What’s up?</T>
            <T tone="textDim" style={{ textAlign: 'center' }}>
              Ask me anything about your money, or tell me what you spent.
            </T>
            {notes.length > 0 && (
              <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
                {notes.slice(0, 3).map((n) => (
                  <NoteCard key={nudgeKey(n)} note={n} fmt={fmt} unit={unit} label="Bud noticed" onDismiss={() => dismiss([nudgeKey(n)])} />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
              {starters().map(({ title, hint, text: fill, send: now }) => (
                <Pressable
                  key={title}
                  onPress={() => (now ? send(fill) : (setText(fill), input.current?.focus()))}
                  accessibilityRole="button"
                  accessibilityHint={hint}
                  style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, minHeight: 72, padding: space.md, gap: space.xxs, borderRadius: radius.md, backgroundColor: pressed ? t.surfaceSunken : t.surface })}
                >
                  <T variant="bodyStrong">{title}</T>
                  <T variant="caption" tone="textDim">
                    {hint}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          msgs.map((x) =>
            'me' in x ? (
              <View key={x.id} style={{ alignSelf: 'flex-end', maxWidth: '80%', backgroundColor: t.primary, borderRadius: radius.md, borderBottomRightRadius: 4, paddingHorizontal: space.md, paddingVertical: space.sm }}>
                <T style={{ color: t.onPrimary }}>{x.me}</T>
              </View>
            ) : (
              <SlipView key={x.id} slip={x.slip} />
            ),
          )
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingBottom: space.lg, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.bg }}>
        {app.aiEnabled && (
          <Pressable onPress={() => router.push('/receipt')} accessibilityRole="button" accessibilityLabel="Snap a receipt" hitSlop={8} style={{ padding: space.xs }}>
            <Icon name={{ ios: 'camera', android: 'photo_camera' }} color={t.accent} />
          </Pressable>
        )}
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={(e) => send(e.nativeEvent.text)}
          placeholder={app.aiEnabled ? 'Ask or add…' : quickAddExample(m?.setup.profile.currency)}
          placeholderTextColor={t.placeholder}
          returnKeyType="send"
          accessibilityLabel="Ask or add"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Its own border shows focus instead of the browser's square outline.
          style={[{ flex: 1, minHeight: touch.min, fontSize: 17, color: t.text, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: focused ? t.accent : t.line, paddingHorizontal: space.md }, noWebOutline]}
        />
        <Pressable
          onPress={() => send(text)}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? t.accent : t.surfaceSunken }}
        >
          <Icon name={{ ios: 'arrow.up', android: 'arrow_upward' }} size={20} color={text.trim() ? t.bg : t.textDim} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// One printed answer: Bud's face, then a torn-edge slip in mono ink, then its actions.
function SlipView({ slip }: { slip: Slip }) {
  const ink = { color: palette.ink, fontFamily: MONO };
  const dim = { color: palette.inkDim, fontFamily: MONO };
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
      <Bud face={slip.face} size={36} />
      <View style={{ flex: 1, gap: space.xs }}>
        <ReceiptCard>
          <T variant="label" style={dim}>
            {slip.title.toUpperCase()}
          </T>
          {slip.printing && <PrintingLines />}
          {slip.lines?.map(([label, value], i) => (
            <ReceiptLine key={i} label={label} value={value} />
          ))}
          {slip.total && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderStyle: 'dashed', borderColor: palette.inkDim, paddingTop: space.xs }}>
              <T variant="bodyStrong" style={ink}>
                {slip.total[0]}
              </T>
              <Marker>
                <T variant="bodyStrong" money style={ink}>
                  {slip.total[1]}
                </T>
              </Marker>
            </View>
          )}
          {slip.note && <T style={{ color: palette.inkDim }}>{slip.note}</T>}
          {slip.ai && (
            <T variant="caption" style={dim}>
              AI answer. Check the numbers.
            </T>
          )}
        </ReceiptCard>
        {slip.actions}
      </View>
    </View>
  );
}

// The slip "printing" while an answer loads: what Bud is doing, a step at a time, over placeholder lines
// that shimmer. It stops on the last step rather than loop, so a slow answer doesn't look stuck in a
// circle. Steps still change under Reduce Motion; only the fade and shimmer stop.
const THINKING = ['Going through your spending…', 'Checking rent and bills…', 'Counting what’s left…', 'Writing it down…'];

function PrintingLines() {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(0.5);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!reduce) opacity.value = withRepeat(withTiming(0.15, { duration: 700 }), -1, true);
  }, [reduce, opacity]);
  useEffect(() => {
    const id = setInterval(() => setStep((n) => Math.min(n + 1, THINKING.length - 1)), 700);
    return () => clearInterval(id);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={{ gap: space.xs }} accessible accessibilityLabel="Bud is thinking">
      <Animated.View key={step} entering={reduce ? undefined : FadeIn.duration(200)}>
        <T variant="caption" style={{ color: palette.inkDim, fontFamily: MONO }}>
          {THINKING[step]}
        </T>
      </Animated.View>
      <Animated.View style={[{ gap: space.xs, paddingVertical: space.xxs }, style]}>
        {['90%', '70%', '45%'].map((w) => (
          <View key={w} style={{ width: w as `${number}%`, height: 12, borderRadius: 3, backgroundColor: palette.inkDim }} />
        ))}
      </Animated.View>
    </View>
  );
}
