// Wrapped (design system 4.7): a month as a story of cobalt pages, one stat each, from local data.
// Free: total vs budget, top category and what was kept. Pro adds top place, treats, hours of work and
// the best streak, and the year-end edition (?year=2026) with the year's lightest month. Captions are
// rule-written; with AI on, one AI line per page joins them (numbers only, CaptionController).
import { space } from '@senbud/core/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReceiptCard } from '@/art';
import { mealExample, useCurrency } from '@/currencies';
import { type CaptionPage, wrappedCaptions } from '@/api';
import { loadApp, today } from '@/db';
import { useWrapped } from '@/money';
import { BarChart, Button, MONO, StoryPager, T, useTheme } from '@/ui';

const Big = ({ children, size = 96 }: { children: string; size?: number }) => (
  <T
    variant="hero"
    tone="highlight"
    money
    numberOfLines={1}
    adjustsFontSizeToFit
    maxFontSizeMultiplier={1.3}
    style={{ fontSize: size, lineHeight: size + 4, letterSpacing: -size / 32 }}
  >
    {children}
  </T>
);

export default function Wrapped() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { month, year: yearKey } = useLocalSearchParams<{ month?: string; year?: string }>();
  const currency = useCurrency();
  // On web the URL can be opened bare; fall back to this month.
  const key = yearKey ?? month ?? today().slice(0, 7);
  const r = useWrapped(key);
  // AI captions, only for people who agreed to AI for Bud and have it on. Numbers only (see "What gets sent").
  const [ai, setAi] = useState<Record<CaptionPage, string> | null>(null);
  const ready = !!r && !(r.year && !r.pro) && r.w.spent + r.w.bills > 0;
  useEffect(() => {
    if (!ready || !r) return;
    const { w, unit } = r;
    loadApp(db).then((a) => {
      if (!a.aiEnabled || !a.aiConsentAt) return;
      const total = w.spent + w.bills;
      wrappedCaptions(
        { currency: r.currency, span: unit as 'month' | 'year', used: Math.min(100, w.used), top_category: w.categories[0]?.category ?? null, top_share: w.categories[0]?.share ?? 0, kept: w.saved / 100, over: Math.max(0, total - w.budget) / 100, treats: w.treats, streak: w.streak },
        a.deviceId,
      ).then(setAi);
    });
    // Once per story: the numbers don't change while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
  if (!r) return <View style={{ flex: 1, backgroundColor: t.panel }} />;
  const { w, name, fmt, pro, hours, running, unit, year, monthName } = r;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const total = w.spent + w.bills;

  const pages: { label: string; body: React.ReactNode }[] = [];
  if (year && !pro) {
    pages.push({
      label: `Your ${name} Wrapped comes with Senbud Pro.`,
      body: (
        <>
          <T variant="title" tone="onPanel">
            Your {name}, wrapped
          </T>
          <T tone="onPanelDim">The whole year as a story: what you spent, your top place, your lightest month and your best streak. It comes with Senbud Pro.</T>
        </>
      ),
    });
  } else if (!total) {
    pages.push({
      label: `Nothing logged in ${r.month}.`,
      body: (
        <>
          <T variant="title" tone="onPanel">
            Nothing logged in {r.month}.
          </T>
          <T tone="onPanelDim">Type “{mealExample(currency)}” on Home and next month’s Wrapped fills itself in.</T>
        </>
      ),
    });
  } else {
    pages.push({
      label: `You spent ${pct(w.used)} of your budget. ${fmt(total)} of ${fmt(w.budget)}.`,
      body: (
        <>
          <T variant="title" tone="onPanel">
            You spent
          </T>
          <Big>{pct(w.used)}</Big>
          <T variant="heading" tone="onPanel">
            of your budget{running ? ' so far' : ''}.
          </T>
          <T tone="onPanelDim" money>
            {fmt(total)} of {fmt(w.budget)}
            {w.bills ? ', rent and bills included.' : '.'}
          </T>
          {ai && <T tone="onPanel">{ai.spent}</T>}
        </>
      ),
    });
    const top = w.categories[0];
    if (top)
      pages.push({
        label: `${top.category} took ${pct(top.share)} of your spending.`,
        body: (
          <>
            <T variant="title" tone="onPanel">
              {top.category} took
            </T>
            <Big size={80}>{pct(top.share)}</Big>
            <ReceiptCard style={{ marginTop: space.sm }}>
              <BarChart data={w.categories} font={MONO} />
            </ReceiptCard>
            {ai && <T tone="onPanel">{ai.top}</T>}
          </>
        ),
      });
    pages.push(
      total <= w.budget
        ? {
            label: `You kept ${fmt(w.saved)} of your budget.`,
            body: (
              <>
                <T variant="title" tone="onPanel">
                  You kept
                </T>
                <Big size={80}>{fmt(w.saved)}</Big>
                <T variant="heading" tone="onPanel">
                  of your budget{running ? ' so far' : ''}.
                </T>
                <T tone="onPanelDim">{ai?.kept ?? 'That’s what the treat jar is for.'}</T>
              </>
            ),
          }
        : {
            label: `${fmt(total - w.budget)} over. No stress, new ${unit}, fresh start.`,
            body: (
              <>
                <T variant="title" tone="onPanel">
                  Over by
                </T>
                <Big size={80}>{fmt(total - w.budget)}</Big>
                <T variant="heading" tone="onPanel">
                  No stress. New {unit}, fresh start.
                </T>
                {ai && <T tone="onPanelDim">{ai.kept}</T>}
              </>
            ),
          },
    );
    if (pro) {
      if (w.topPlace) {
        const { label, visits } = w.topPlace;
        const often = visits * 5 >= w.days * 4 ? 'That’s nearly one a day.' : `About one every ${Math.round(w.days / visits)} days.`;
        pages.push({
          label: `Your top place: ${label}, ${visits} visits. ${often}`,
          body: (
            <>
              <T variant="label" tone="onPanelDim">
                Your top place
              </T>
              <T variant="title" tone="onPanel" style={{ fontSize: 40, lineHeight: 46 }}>
                {label}
              </T>
              <Big size={80}>{`${visits} visits`}</Big>
              <T variant="heading" tone="onPanel">
                {often}
              </T>
            </>
          ),
        });
      }
      if (w.bestMonth) {
        const best = monthName(w.bestMonth.month);
        pages.push({
          label: `Your lightest month: ${best}, ${fmt(w.bestMonth.cents)}.`,
          body: (
            <>
              <T variant="label" tone="onPanelDim">
                Your lightest month
              </T>
              <Big size={80}>{best}</Big>
              <T variant="heading" tone="onPanel" money>
                {fmt(w.bestMonth.cents)} spent. Do that again.
              </T>
            </>
          ),
        });
      }
      pages.push({
        label: `${w.treats} ${w.treats === 1 ? 'treat' : 'treats'} this ${unit}.`,
        body: (
          <>
            <T variant="label" tone="onPanelDim">
              Treats
            </T>
            <Big>{String(w.treats)}</Big>
            <T variant="heading" tone="onPanel">
              {w.treats === 1 ? 'treat' : 'treats'} this {unit}.
            </T>
            <T tone="onPanelDim">{ai?.treats ?? (w.treats ? 'You earned them.' : 'None logged. The jar’s waiting.')}</T>
          </>
        ),
      });
      if (hours)
        pages.push({
          label: `${hours} hours of work, at your hourly rate.`,
          body: (
            <>
              <T variant="label" tone="onPanelDim">
                Hours of work
              </T>
              <Big>{`${hours} hrs`}</Big>
              <T variant="heading" tone="onPanel">
                of work went into {fmt(w.spent)}.
              </T>
            </>
          ),
        });
      pages.push({
        label: `Best streak: ${w.streak} days in a row within your daily budget.`,
        body: (
          <>
            <T variant="label" tone="onPanelDim">
              Best streak
            </T>
            <Big>{`${w.streak} ${w.streak === 1 ? 'day' : 'days'}`}</Big>
            <T variant="heading" tone="onPanel">
              in a row within your daily budget.
            </T>
            {ai && <T tone="onPanelDim">{ai.streak}</T>}
          </>
        ),
      });
    } else {
      pages.push({
        label: 'There’s more with Senbud Pro: top place, treats, hours of work and your best streak.',
        body: (
          <>
            <T variant="title" tone="onPanel">
              There’s more
            </T>
            <T tone="onPanelDim">Your top place, treats, hours of work and best streak come with Senbud Pro.</T>
          </>
        ),
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.panel, paddingTop: Platform.OS === 'ios' ? space.lg : insets.top + space.sm, paddingBottom: insets.bottom + space.md, paddingHorizontal: space.lg }}>
      <StatusBar style="light" />
      <StoryPager
        title={name}
        pages={pages}
        onClose={() => router.back()}
        footer={(i) =>
          !pro && i === pages.length - 1 && total ? (
            <Button title="See plans" variant="highlight" onPress={() => router.push('/pro')} />
          ) : total ? (
            <Button title="Share" variant="onPanel" onPress={() => router.push({ pathname: '/share', params: year ? { year: key } : { month: key } })} />
          ) : null
        }
      />
    </View>
  );
}
