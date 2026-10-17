// "Can I afford it?" (spec 4.5, design system 4.4). The answer updates as you type; rent comes first.
import { addDays, afford, billCountdown, daysBetween, hoursOfWork } from '@senbud/core';
import { space, type } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { useMoney } from '@/money';
import { periodWord } from '@/onboarding';
import { TextInput, View } from 'react-native';

import { addTransactions, type AppState, loadApp } from '@/db';
import { Button, Card, Field, Screen, T, TextButton, useTheme } from '@/ui';

export default function Afford() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m } = useMoney();
  const [app, setApp] = useState<AppState | null>(null);
  const [price, setPrice] = useState('');
  const [what, setWhat] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadApp(db).then(setApp);
    }, [db]),
  );

  if (!m || !app) return null;
  const { setup, safe, fmt, day } = m;
  const { locale } = setup.profile;
  const unit = periodWord(setup.budget.period);
  const periodDays = daysBetween(safe.start, safe.nextStart);
  const cents = Math.round(Number(price.replace(',', '.')) * 100);
  const typed = cents > 0;
  const result = typed ? afford(cents, { left: safe.left, daysLeft: safe.daysLeft, weeklyBudget: (setup.budget.cents / periodDays) * 7 }) : null;
  const lastDay = new Date(`${addDays(safe.nextStart, -1)}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fits = new Date(`${safe.nextStart}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const rent = setup.rent && billCountdown(setup.rent, day);
  const hours = typed && app.hourlyRateCents ? hoursOfWork(cents, app.hourlyRateCents) : null;

  const verdict = !result
    ? null
    : result.verdict === 'yes'
      ? { title: 'Yes, go for it.', big: fmt(Math.floor(result.perDayAfter)), caption: `a day till ${lastDay}. Rent’s still covered.` }
      : result.verdict === 'tight'
        ? { title: 'Doable, but tight.', big: fmt(Math.floor(result.perDayAfter)), caption: `a day, down from ${fmt(Math.floor(Math.max(0, safe.left) / safe.daysLeft))}. Wait till the next ${unit}?` }
        : {
            title: `Not this ${unit}.`,
            big: fits,
            caption: rent && rent.days < safe.daysLeft ? `Rent’s in ${rent.days} days, and this would eat into it.` : `It’s more than what’s left this ${unit}.`,
          };

  async function bought() {
    await addTransactions(db, [{ date: day, cents, label: what.trim() || 'Purchase', category: 'Other', source: 'manual' }]);
    router.back();
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <T variant="label" tone="textDim">
          Price
        </T>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="0"
          placeholderTextColor={t.placeholder}
          accessibilityLabel="Price"
          style={{ ...type.title, fontSize: 28, color: t.text, backgroundColor: t.surface, borderRadius: 8, borderWidth: 1, borderColor: t.line, paddingHorizontal: 12, minHeight: 56 }}
        />
      </View>
      <Field label="What is it? (optional)" value={what} onChangeText={setWhat} placeholder="Concert ticket" />

      <Card tone="panel">
        {verdict ? (
          <>
            <T variant="title" tone="onPanel" accessibilityLiveRegion="polite">
              {verdict.title}
            </T>
            <T variant="label" tone="onPanelDim">
              {result!.verdict === 'no' ? 'It fits from' : 'After it you’d have'}
            </T>
            <T variant="hero" tone="highlight" money numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
              {verdict.big}
            </T>
            <T variant="caption" tone="onPanelDim">
              {verdict.caption}
            </T>
            {hours !== null && (
              <View style={{ borderTopWidth: 1, borderColor: t.onPanelDim, paddingTop: space.sm, marginTop: space.xs }}>
                <T variant="caption" tone="onPanelDim">
                  That’s {hours} {hours === 1 ? 'hour' : 'hours'} of work at {fmt(app.hourlyRateCents!)} an hour.
                </T>
              </View>
            )}
          </>
        ) : (
          <>
            <T variant="label" tone="onPanelDim">
              Safe to spend today
            </T>
            <T variant="hero" tone="highlight" money>
              {fmt(safe.covered ? safe.perDay : 0)}
            </T>
            <T variant="caption" tone="onPanelDim">
              Type a price and Senbud checks it against this, rent first.
            </T>
          </>
        )}
      </Card>

      {typed && !app.hourlyRateCents && (
        <Card>
          <T>Have a part-time job? Add your pay per hour and Senbud shows how many hours of work this costs.</T>
          <TextButton title="Add pay per hour" onPress={() => router.push('/rate')} />
        </Card>
      )}
      {result && result.verdict !== 'no' && <Button title="I bought it" variant="secondary" onPress={bought} />}
    </Screen>
  );
}
