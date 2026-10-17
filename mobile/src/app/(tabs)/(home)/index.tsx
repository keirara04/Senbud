import { addDays, aheadOfPace, billCountdown, favourites, isQuestion, nudgeKey, readIntent, type Transaction } from '@senbud/core';
import { motion, palette, radius, space } from '@senbud/core/tokens';
import { Redirect, router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReceiptCard } from '@/art';
import { mealExample, quickAddExample } from '@/currencies';
import { addCarry, addTransactions, deleteTransactions, listTransactions, type Txn } from '@/db';
import { useMoney } from '@/money';
import { periodWord } from '@/onboarding';
import { NoteCard, useBudNotes } from '@/notes';
import { usePro } from '@/purchases';
import { Button, Card, Icon, MONO, noWebOutline, Progress, ReceiptLine, Row, T, TextButton, UndoBar, useTheme } from '@/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Home() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { money: m, reload } = useMoney();
  const pro = usePro();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState('');
  const [undo, setUndo] = useState<{ ids: number[]; summary: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saving = useRef(false); // the return key can fire twice before the first save lands
  // The last 30 days, for "Add again": this period alone would leave it empty on the 1st.
  const [recent, setRecent] = useState<Txn[]>([]);

  const { notes, homeHidden, dismiss } = useBudNotes(m);
  useEffect(() => () => clearTimeout(undoTimer.current), []);
  useEffect(() => {
    if (m) listTransactions(db, addDays(m.day, -30)).then(setRecent);
  }, [db, m]);

  if (m === undefined) return null;
  if (m === null) return <Redirect href="/welcome" />;

  const { setup, txns, safe, status, fmt, day, limit, borrowable } = m;
  const { locale } = setup.profile;
  const { period } = setup.budget;
  const unit = periodWord(period);
  // Until payday rolls on at the same length after payday; until a new date is set, ask for one.
  const paydayPassed = period.kind === 'until' && period.payday <= day;
  const rent = setup.rent && { ...setup.rent, ...billCountdown(setup.rent, day) };
  // This period's rent already fell due (or came before Setup): the next one is next period's money.
  const rentNext = rent && rent.due >= safe.nextStart;
  // One note on Home at most (spec 5), and not rent: it has its own card. "Not today" hides Home's for the day.
  const note = homeHidden ? undefined : notes.find((n) => !(n.kind === 'bill' && n.bill.name === 'Rent'));
  const todays = txns.filter((x) => x.date === day);
  const again = favourites(recent);
  const now = new Date();
  const dateLabel = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });

  // Pace copy from spec 4.2; the pace nudge (priority 2) lives in this card, not a separate one.
  const pace =
    status === 'over'
      ? `${fmt(safe.spent - limit)} over, no stress.`
      : status === 'close'
        ? `${fmt(limit - safe.spent)} left. Cook tonight?`
        : aheadOfPace(safe.spent, limit, safe, day)
          ? `${fmt(safe.spent)} of ${fmt(limit)} gone and it’s only ${WEEKDAYS[now.getDay()]}.`
          : 'On track.';

  // Carry-over (Pro, spec 4.2): cover what's over from next period's budget, up to what it has.
  const over = Math.min(safe.spent - limit, borrowable);
  async function borrow() {
    if (!pro) return router.push('/pro');
    await addCarry(db, [
      [safe.start, over],
      [safe.nextStart, -over],
    ]);
    reload();
  }

  async function submit() {
    const line = text.trim();
    if (!line || saving.current) return;
    // Same rules as Bud: anything but a quick add goes to Bud ("who won the cup in 2022" isn't a 2022
    // expense); a line that's neither gets a hint.
    const intent = readIntent(line, setup.profile.currency);
    if (intent.kind !== 'add') {
      if (intent.kind === 'ask' && !isQuestion(line)) return setHint(`Add an amount, like “${mealExample(setup.profile.currency)}”.`);
      setText('');
      return router.push({ pathname: '/assistant', params: { q: line } });
    }
    const rows: Transaction[] = intent.items.map((i) => ({ date: day, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'text' }));
    if (await save(rows)) setText('');
  }

  // The one way Home saves: quick add and "Add again" both land here, with the same Undo and guard.
  async function save(rows: Transaction[]) {
    if (saving.current) return false;
    saving.current = true;
    let ids: number[];
    try {
      ids = await addTransactions(db, rows);
    } finally {
      saving.current = false;
    }
    setHint('');
    clearTimeout(undoTimer.current);
    const total = fmt(rows.reduce((s, r) => s + r.cents, 0));
    setUndo({ ids, summary: rows.length === 1 ? `Added ${rows[0].label}, ${total}` : `Added ${rows.length} items, ${total}` });
    undoTimer.current = setTimeout(() => setUndo(null), motion.undoMs);
    reload();
    return true;
  }

  async function undoAdd() {
    if (!undo) return;
    clearTimeout(undoTimer.current);
    await deleteTransactions(db, undo.ids);
    setUndo(null);
    reload();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Our own top row, not the system header: iOS 26 wraps header items in glass pills, which made
          the date look like a button. The date is plain text; Settings is the one button. */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + space.xs, paddingHorizontal: space.md, paddingBottom: space.xs, flexDirection: 'row', alignItems: 'center' }}>
        <T variant="bodyStrong" tone="textDim" style={{ flex: 1 }} accessibilityRole="header">
          {dateLabel}
        </T>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.surfaceSunken : t.surface })}
        >
          <Icon name={{ ios: 'gearshape', android: 'settings' }} size={22} color={t.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: space.xs, gap: space.md }} keyboardShouldPersistTaps="handled">
        <Card tone="panel">
          <T variant="label" tone="onPanelDim">
            Safe to spend today
          </T>
          <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
            {fmt(safe.covered ? safe.perDay : 0)}
          </T>
          <T variant="caption" tone="onPanelDim">
            {safe.covered
              ? `${fmt(Math.max(0, safe.left))} left for ${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'}${safe.owed || safe.upcoming ? ', after rent and bills' : ''}`
              : safe.owed
                ? 'Rent comes first. This goes back up once it’s covered.'
                : `${fmt(-safe.left)} over this budget. It resets with the next one.`}
          </T>
        </Card>

        {paydayPassed && (
          <Card>
            <T>
              Payday was {new Date(`${period.payday}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })}. When’s the next one?
            </T>
            <Button title="Set next payday" variant="secondary" onPress={() => router.push('/edit-budget')} />
          </Card>
        )}

        {rent && rentNext && (
          <Card>
            <T>
              Rent {fmt(rent.cents)} on {new Date(`${rent.due}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })}, from next {unit}’s budget.
            </T>
          </Card>
        )}

        {rent && !rentNext && (
          <Card>
            <T>
              Rent {fmt(rent.cents)} {rent.days === 0 ? 'is due today' : `in ${rent.days} ${rent.days === 1 ? 'day' : 'days'}`}
              {safe.covered ? '. You’re covered.' : `. ${fmt(-safe.left)} short.`}
            </T>
            {!safe.covered && (
              <>
                <T variant="caption" tone="textDim">
                  No stress. Hold off on treats and Senbud will plan the next {rent.days || 1} days around rent.
                </T>
                <Button title="Plan for rent" variant="secondary" onPress={() => router.push('/budgets')} />
              </>
            )}
          </Card>
        )}

        <Card>
          <Row>
            <T variant="bodyStrong" money>
              {fmt(safe.spent)} of {fmt(limit)}
            </T>
            <T variant="caption" tone="textDim">
              this {unit}
            </T>
          </Row>
          <Progress value={safe.spent / limit} status={status} />
          <Row>
            <T variant="caption" tone={status === 'over' ? 'bad' : status === 'close' ? 'warn' : 'textDim'} style={{ flexShrink: 1 }}>
              {pace}
            </T>
            <TextButton title="See activity" onPress={() => router.push('/activity')} />
          </Row>
          {status === 'over' && over > 0 && <TextButton title={`Borrow ${fmt(over)} from next ${unit}`} onPress={borrow} />}
        </Card>

        {note && <NoteCard note={note} fmt={fmt} unit={unit} onDismiss={() => dismiss(['home', nudgeKey(note)])} />}

        {/* Today's receipt: what you've logged today, in the app's paper. White in both themes, as on
            Budgets; the total stays plain ink so the hero number is the only highlight on Home. */}
        <ReceiptCard>
          <T variant="label" style={{ color: palette.inkDim, fontFamily: MONO }}>
            TODAY
          </T>
          {todays.length ? (
            <>
              {todays.slice(0, 3).map((x) => (
                <ReceiptLine key={x.id} label={x.label} value={fmt(x.cents)} />
              ))}
              {todays.length > 3 && (
                <Pressable onPress={() => router.push('/activity')} accessibilityRole="link" hitSlop={8}>
                  <T variant="caption" style={{ color: palette.cobalt, fontFamily: MONO }}>
                    and {todays.length - 3} more
                  </T>
                </Pressable>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderStyle: 'dashed', borderColor: palette.inkDim, paddingTop: space.xs }}>
                <T variant="bodyStrong" style={{ color: palette.ink, fontFamily: MONO }}>
                  Total
                </T>
                <T variant="bodyStrong" money style={{ color: palette.ink, fontFamily: MONO }}>
                  {fmt(safe.spentToday)}
                </T>
              </View>
            </>
          ) : (
            <T style={{ color: palette.inkDim, fontFamily: MONO }}>
              {txns.length ? 'Nothing yet today.' : `Type what you spent below, like “${mealExample(setup.profile.currency)}”. Senbud does the rest.`}
            </T>
          )}
        </ReceiptCard>
        <TextButton title="Can I afford it?" onPress={() => router.push('/afford')} />
      </ScrollView>

      <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm }}>
        {undo && <UndoBar message={undo.summary} onUndo={undoAdd} />}
        {/* Add again (spec 4.1 favourites): one tap logs a usual at its last price, through save().
            Plain surface chips, not category tints: Treat's tint is yellow, and Home keeps one yellow. */}
        {!undo && again.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.xs, alignItems: 'center' }}>
            <T variant="caption" tone="textDim">
              Again
            </T>
            {again.map((f) => (
              <Pressable
                key={f.label}
                onPress={() => save([{ date: day, cents: f.cents, label: f.label, category: f.category, source: 'text' }])}
                accessibilityRole="button"
                accessibilityLabel={`Add ${f.label}, ${fmt(f.cents)}, again`}
                hitSlop={{ top: 6, bottom: 6 }}
                style={({ pressed }) => ({ minHeight: 36, justifyContent: 'center', paddingHorizontal: space.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: t.line, backgroundColor: pressed ? t.surfaceSunken : t.surface })}
              >
                <T variant="caption" style={{ fontWeight: '600' }}>
                  {f.label} {fmt(f.cents)}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {hint ? (
          <T variant="caption" tone="bad">
            {hint}
          </T>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            backgroundColor: t.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: focused ? t.accent : t.line,
            paddingHorizontal: space.xs,
          }}
        >
          <Pressable onPress={() => router.push('/receipt')} accessibilityRole="button" accessibilityLabel="Snap a receipt" style={{ padding: space.sm }} hitSlop={4}>
            <Icon name={{ ios: 'camera', android: 'photo_camera' }} color={t.accent} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              setHint('');
            }}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder={quickAddExample(setup.profile.currency)}
            placeholderTextColor={t.placeholder}
            selectionColor={t.accent}
            accessibilityLabel="Type what you spent, or ask Bud"
            autoFocus={!txns.length}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // The bar's border shows focus instead of the browser's square outline.
            style={[{ flex: 1, minHeight: 48, fontSize: 17, color: t.text }, noWebOutline]}
          />
          <Pressable onPress={() => router.push('/add')} accessibilityRole="button" accessibilityLabel="Add by hand" style={{ padding: space.sm }} hitSlop={4}>
            <Icon name={{ ios: 'pencil', android: 'edit' }} color={t.accent} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
