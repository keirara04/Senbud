import { aheadOfPace, billCountdown, isQuestion, nudgeKey, readIntent, type Transaction } from '@senbud/core';
import { motion, radius, space } from '@senbud/core/tokens';
import { Redirect, router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addTransactions, deleteTransactions } from '@/db';
import { useMoney } from '@/money';
import { NoteCard, useBudNotes } from '@/notes';
import { Button, Card, Icon, Progress, Row, T, TextButton, UndoBar, useTheme } from '@/ui';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Home() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { money: m, reload } = useMoney();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState('');
  const [undo, setUndo] = useState<{ ids: number[]; summary: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { notes, homeHidden, dismiss } = useBudNotes(m);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  if (m === undefined) return null;
  if (m === null) return <Redirect href="/welcome" />;

  const { setup, txns, safe, status, fmt, day } = m;
  const { locale } = setup.profile;
  const limit = setup.budget.cents;
  const unit = setup.budget.period.kind;
  const rent = setup.rent && { ...setup.rent, ...billCountdown(setup.rent, day) };
  // One note on Home at most (spec 5), and not rent: it has its own card. "Not today" hides Home's for the day.
  const note = homeHidden ? undefined : notes.find((n) => !(n.kind === 'bill' && n.bill.name === 'Rent'));
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

  async function submit() {
    const line = text.trim();
    if (!line) return;
    // Same rules as Bud: anything but a quick add goes to Bud ("who won the cup in 2022" isn't a 2022
    // expense); a line that's neither gets a hint.
    const intent = readIntent(line);
    if (intent.kind !== 'add') {
      if (intent.kind === 'ask' && !isQuestion(line)) return setHint('Add an amount, like “nasi lemak 6.50”.');
      setText('');
      return router.push({ pathname: '/assistant', params: { q: line } });
    }
    const rows: Transaction[] = intent.items.map((i) => ({ date: day, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'text' }));
    const ids = await addTransactions(db, rows);
    setText('');
    setHint('');
    clearTimeout(undoTimer.current);
    const total = fmt(rows.reduce((s, r) => s + r.cents, 0));
    setUndo({ ids, summary: rows.length === 1 ? `Added ${rows[0].label}, ${total}` : `Added ${rows.length} items, ${total}` });
    undoTimer.current = setTimeout(() => setUndo(null), motion.undoMs);
    reload();
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
              ? `${fmt(Math.max(0, safe.left))} left for ${safe.daysLeft} ${safe.daysLeft === 1 ? 'day' : 'days'}, after rent and bills`
              : 'Rent comes first. This goes back up once it’s covered.'}
          </T>
        </Card>

        {rent && (
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
        </Card>

        {note && <NoteCard note={note} fmt={fmt} unit={unit} onDismiss={() => dismiss(['home', nudgeKey(note)])} />}

        {!txns.length && <T tone="textDim">Type what you spent below, like “nasi lemak 6.50”. Senbud does the rest.</T>}
        <TextButton title="Can I afford it?" onPress={() => router.push('/afford')} />
      </ScrollView>

      <View style={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm }}>
        {undo && <UndoBar message={undo.summary} onUndo={undoAdd} />}
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
            placeholder="kopi 4.50, grab 12"
            placeholderTextColor={t.textDim}
            selectionColor={t.accent}
            accessibilityLabel="Type what you spent, or ask Bud"
            autoFocus={!txns.length}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // The bar's border shows focus instead of the browser's square outline.
            style={{ flex: 1, minHeight: 48, fontSize: 17, color: t.text, outlineWidth: 0 }}
          />
          <Pressable onPress={() => router.push('/add')} accessibilityRole="button" accessibilityLabel="Add by hand" style={{ padding: space.sm }} hitSlop={4}>
            <Icon name={{ ios: 'pencil', android: 'edit' }} color={t.accent} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
