// Treats (design system 4.6): the jar filling toward a goal on the cobalt panel, your treats with
// whether they fit today, and what went in and out of the jar.
import { addDays, daysBetween, jarFill, treatNudge, treatsInJar } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { TreatJar } from '@/art';
import { treatExample } from '@/currencies';
import { addToJar, addTreat, deleteRow, type Jar, jarHistory, listTransactions, listTreats, loadJar, restoreRow, setJarGoal, today, type TreatRow } from '@/db';
import { useMoney } from '@/money';
import { Button, Card, Icon, Row, Screen, T, TextButton, UndoBar, useTheme, useUndo } from '@/ui';

type History = Awaited<ReturnType<typeof jarHistory>>;

export default function Treats() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m } = useMoney();
  const [jar, setJar] = useState<Jar | null>(null);
  const [treats, setTreats] = useState<TreatRow[]>([]);
  const [history, setHistory] = useState<History>([]);
  const [learned, setLearned] = useState<{ name: string; times: number; cents: number; date: string } | null>(null);
  const [skipLearned, setSkipLearned] = useState(false);
  const removed = useUndo<{ treat: TreatRow; row: Awaited<ReturnType<typeof deleteRow>> }>();

  const load = useCallback(async () => {
    const [j, ts, h, txns] = await Promise.all([loadJar(db), listTreats(db), jarHistory(db), listTransactions(db)]);
    setJar(j);
    setTreats(ts);
    setHistory(h);
    // A treat Senbud noticed: the same Treat-category label 3+ times in 30 days, not already a treat.
    const since = addDays(today(), -30);
    const counts = new Map<string, { times: number; cents: number; date: string }>();
    for (const x of txns) {
      if (x.category !== 'Treat' || x.date < since || ts.some((tr) => tr.name.toLowerCase() === x.label.toLowerCase())) continue;
      const c = counts.get(x.label) ?? { times: 0, cents: x.cents, date: x.date };
      counts.set(x.label, { ...c, times: c.times + 1 });
    }
    const top = [...counts.entries()].sort((a, b) => b[1].times - a[1].times)[0];
    setLearned(top && top[1].times >= 3 ? { name: top[0], ...top[1] } : null);
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!m || !jar) return null;
  const { fmt, day, safe } = m;
  const fill = jarFill(jar.balanceCents, jar.goalCents ?? undefined);
  const cheapest = [...treats].sort((a, b) => a.lastCents - b.lastCents)[0];

  const caption = !jar.goalCents
    ? jar.balanceCents
      ? cheapest
        ? `= ${treatsInJar(jar.balanceCents, cheapest.lastCents)} × ${cheapest.name}.`
        : 'Add a treat below to see what this buys.'
      : 'Leftover budget lands here at the end of each month.'
    : fill!.reached
      ? `Goal reached. ${jar.goalName} is covered, with ${fmt(jar.balanceCents - jar.goalCents)} spare.`
      : `${cheapest ? `= ${treatsInJar(jar.balanceCents, cheapest.lastCents)} × ${cheapest.name}. ` : ''}${fmt(fill!.toGo)} to your goal.`;

  async function spendGoal() {
    if (!jar?.goalCents || !jar.goalName) return;
    // Only the jar is debited: its money was set aside in earlier periods, so logging an expense
    // here would count it against this period's budget a second time.
    await addToJar(db, -jar.goalCents, jar.goalName, day);
    await setJarGoal(db, null, null);
    load();
  }

  async function makeTreat() {
    if (!learned) return;
    await addTreat(db, { name: learned.name, lastCents: learned.cents, lastDate: learned.date, minDaysBetween: 7 });
    load();
  }

  return (
    <Screen
      overlay={
        removed.item && (
          <UndoBar
            message={`Removed ${removed.item.treat.name}`}
            onUndo={async () => {
              const r = removed.take();
              if (r?.row) await restoreRow(db, 'treats', r.row);
              load();
            }}
          />
        )
      }
    >
      <Card tone="panel">
        <T variant="label" tone="onPanelDim">
          Treat jar
        </T>
        <Row style={{ flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start', gap: space.md }}>
          <TreatJar share={fill?.share ?? 0} />
          <View style={{ flex: 1, gap: space.xs }}>
            {jar.goalCents ? (
              <>
                <T variant="caption" tone="onPanelDim">
                  Goal
                </T>
                <T variant="bodyStrong" tone="onPanel">
                  {jar.goalName}, {fmt(jar.goalCents)}
                </T>
                <T variant="caption" tone="onPanelDim">
                  {fill!.reached ? 'Full' : `${fill!.percent}% full`}
                </T>
              </>
            ) : (
              <T variant="caption" tone="onPanelDim">
                Pick something to fill it for, like a concert.
              </T>
            )}
            <TextButton
              title={jar.goalCents ? 'Change goal' : 'Set a goal'}
              color={t.onPanel}
              onPress={() => router.push({ pathname: '/jar', params: { mode: 'goal' } })}
            />
          </View>
        </Row>
        <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {fmt(jar.balanceCents)}
        </T>
        <T variant="caption" tone="onPanelDim">
          {caption}
        </T>
        {fill?.reached ? (
          <Button title={`Spend ${fmt(jar.goalCents!)} on ${jar.goalName}`} variant="highlight" onPress={spendGoal} />
        ) : (
          <Button title="Add to jar" variant="highlight" onPress={() => router.push({ pathname: '/jar', params: { mode: 'add' } })} />
        )}
      </Card>

      {learned && !skipLearned && (
        <Card>
          <T>
            You’ve had {learned.name} {learned.times} times in the last 30 days. Make it a treat?
          </T>
          <Row style={{ justifyContent: 'flex-start' }}>
            <Button title="Not now" variant="secondary" onPress={() => setSkipLearned(true)} />
            <Button title="Yes, it’s a treat" variant="secondary" onPress={makeTreat} />
          </Row>
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <T variant="label" tone="textDim">
          Your treats
        </T>
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {treats.map((tr, i) => {
            const ago = tr.lastDate ? daysBetween(tr.lastDate, day) : null;
            const fits = treatNudge(tr, safe, day);
            const wait = tr.lastDate ? tr.minDaysBetween - (ago ?? 0) : 0;
            return (
              <Row key={tr.id} style={{ minHeight: 56, borderTopWidth: i ? 1 : 0, borderColor: t.line, flexWrap: 'nowrap' }}>
                <View style={{ flex: 1, gap: space.xxs }}>
                  <T variant="bodyStrong">{tr.name}</T>
                  <T variant="caption" tone="textDim">
                    every {tr.minDaysBetween} days{ago !== null ? ` · last ${ago === 0 ? 'today' : `${ago} ${ago === 1 ? 'day' : 'days'} ago`}` : ''}
                  </T>
                  <T variant="caption" tone={fits ? 'good' : 'textDim'}>
                    {fits ? 'Fits today' : wait > 0 ? `Next in ${wait} ${wait === 1 ? 'day' : 'days'}` : 'Not today'}
                  </T>
                </View>
                <T variant="bodyStrong" money>
                  {fmt(tr.lastCents)}
                </T>
                <Pressable
                  onPress={async () => {
                    removed.offer({ treat: tr, row: await deleteRow(db, 'treats', tr.id) });
                    load();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${tr.name}`}
                  hitSlop={14}
                  style={{ padding: space.xs }}
                >
                  <Icon name={{ ios: 'trash', android: 'delete' }} size={20} color={t.bad} />
                </Pressable>
              </Row>
            );
          })}
          {!treats.length && (
            <T tone="textDim" style={{ paddingVertical: space.sm }}>
              Add one, like “{treatExample(m.setup.profile.currency)}”. Senbud remembers what you paid.
            </T>
          )}
          <TextButton title="Add a treat" onPress={() => router.push('/treat')} />
        </Card>
      </View>

      {history.length > 0 && (
        <View style={{ gap: space.sm }}>
          <T variant="label" tone="textDim">
            History
          </T>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {history.map((h, i) => (
              <Row key={h.id} style={{ minHeight: 48, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
                <View>
                  <T>{h.note}</T>
                  <T variant="caption" tone="textDim">
                    {new Date(`${h.date}T12:00:00Z`).toLocaleDateString(m.setup.profile.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                  </T>
                </View>
                <T variant="bodyStrong" money tone={h.cents < 0 ? 'textDim' : 'text'}>
                  {h.cents < 0 ? `−${fmt(-h.cents)}` : `+${fmt(h.cents)}`}
                </T>
              </Row>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
