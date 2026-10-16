// Bud, the assistant (design system 4.9). Rules in core (readIntent) answer on the phone; only a question
// in your own words goes to the API, with the summary "What gets sent" promises. Bud prints every answer
// as a receipt slip.
import { addDays, afford, daysBetween, hoursOfWork, readIntent, spentIn, type Transaction } from '@senbud/core';
import { palette, radius, space, touch } from '@senbud/core/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Bud, type BudFace, ReceiptCard } from '@/art';
import { askBud, type AskSummary, type BudAction, type Turn, WEB } from '@/api';
import { type AppState, addTransactions, deleteTransactions, giveAskConsent, loadApp } from '@/db';
import { useMoney } from '@/money';
import { Button, CATEGORIES, Icon, Marker, T, TextButton, useTheme } from '@/ui';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

type Line = [label: string, value: string];
type Slip = { face: BudFace; title: string; lines?: Line[]; total?: Line; note?: string; actions?: ReactNode; printing?: boolean };
type Msg = { id: number; me: string } | { id: number; slip: Slip };

// Title, hint, and what it puts in the box. "How's my month?" answers straight away.
const STARTERS: [string, string, string][] = [
  ['Can I afford…', 'Check a price before you pay', 'Can I afford '],
  ['How’s my month?', 'Where it went, what’s left', 'How’s my month?'],
  ['Split a bill', 'Who owes you what', 'Split '],
  ['Add a few things', '“kopi 4.50, grab 12”', ''],
];

export default function Assistant() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m, reload } = useMoney();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [app, setApp] = useState<AppState | null>(null);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const nextId = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const askedQ = useRef(false);
  // Earlier questions and answers in this chat, sent along so follow-ups work. Never saved.
  const turns = useRef<Turn[]>([]);
  const viewH = useRef(0);

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
  const { setup, safe, fmt, day, txns } = m;
  const unit = setup.budget.period.kind;

  const newId = () => nextId.current++;
  const add = (...more: Msg[]) => setMsgs((cur) => [...cur, ...more]);
  const replace = (id: number, slip: Slip) => setMsgs((cur) => cur.map((x) => (x.id === id ? { id, slip } : x)));

  function affordSlip(cents: number, label: string): Slip {
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
              await addTransactions(db, [{ date: day, cents, label: label || 'Purchase', category: 'Other', source: 'text' }]);
              reload();
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
      title: unit === 'month' ? 'Your month' : 'Your week',
      lines: lines.length ? lines : [['Nothing yet', fmt(0)]],
      total: ['Left', fmt(Math.max(0, safe.left))],
      note: `${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'} to go. Safe today: ${fmt(safe.perDay)}.`,
    };
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
    const intent = readIntent(line);
    const id = newId();
    add({ id: newId(), me: line }, { id, slip: { face: 'thinking', title: 'Bud', printing: true } });

    if (intent.kind === 'afford')
      return replace(id, intent.amount ? affordSlip(Math.round(intent.amount * 100), intent.label) : { face: 'thinking', title: 'Can I afford it?', note: 'Tell me the price, like “can I afford 45”.' });
    if (intent.kind === 'month') return replace(id, monthSlip());
    if (intent.kind === 'add')
      return addSlip(id, intent.items.map((i) => ({ date: day, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'text' })));
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
                <Button title="Just mine" variant="secondary" onPress={() => addSlip(id, [{ date: day, cents, label: label || 'Bill', category: 'Food', source: 'text' }])} />
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
        period: unit,
        days_left: safe.daysLeft,
        budget: major(setup.budget.cents),
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
    const go = (path: string, params: Record<string, string> = {}) => () => router.push(`${path}?${new URLSearchParams(params)}` as never);
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
        note: 'AI is off, so I can’t answer questions. Quick adds still work, like “kopi 4.50”.',
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
    if (!a.askConsentAt)
      return replace(id, {
        face: 'thinking',
        title: 'Before your first question',
        note: 'To answer, Senbud sends your question, your last few questions and answers in this chat, and a short summary (this month’s totals, your budget and rent, and your last 20 expenses) to its server and on to an AI model (currently Anthropic’s Claude Haiku, run by Google) through OpenRouter. It isn’t stored or logged, and only providers that keep no data are used.'.replace('month', unit),
        actions: (
          <Button
            title="Allow and ask"
            onPress={async () => {
              await giveAskConsent(db);
              ask(line, id);
            }}
          />
        ),
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
      replace(id, { face: 'happy', title: 'Bud', note: r.answer, actions: buttons.length ? <View style={{ gap: space.xs }}>{buttons}</View> : undefined });
    } catch (e) {
      replace(id, { face: 'oops', title: 'Bud', note: e instanceof Error ? e.message : String(e), actions: <TextButton title="Try again" onPress={() => ask(line, id)} /> });
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
              {STARTERS.map((s) => s.map((x) => x.replace('month', unit)) as typeof s).map(([title, hint, fill]) => (
                <Pressable
                  key={title}
                  onPress={() => (fill.startsWith('How’s') ? send(fill) : (setText(fill), input.current?.focus()))}
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
          placeholder={app.aiEnabled ? 'Ask or add…' : 'kopi 4.50, grab 12'}
          placeholderTextColor={t.textDim}
          returnKeyType="send"
          accessibilityLabel="Ask or add"
          style={{ flex: 1, minHeight: touch.min, fontSize: 17, color: t.text, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.line, paddingHorizontal: space.md }}
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
            <View key={i} style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
              <T style={[ink, { flexShrink: 1 }]}>{label}</T>
              <T numberOfLines={1} style={[dim, { flex: 1, opacity: 0.5 }]}>
                {'. '.repeat(40)}
              </T>
              <T money style={ink}>
                {value}
              </T>
            </View>
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
