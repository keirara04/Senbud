// The onboarding steps (design system 4.1c): Budget, Rent, You're set. /onboarding runs them in order;
// Settings opens Budget and Rent on their own as sheets (/edit-budget, /edit-rent).
import { type BudgetPeriod, money, periodRange, safeToSpend } from '@senbud/core';
import { palette, space } from '@senbud/core/tokens';
import { type ReactNode, useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PrintingBud, useCountUp } from '@/art';
import { currencyName, localAmount, typed } from '@/currencies';
import { type Budget, type Profile, today } from '@/db';
import { AmountPad, Button, ChoiceCard, DayStrip, digitsOf, Field, Marker, QuickPicks, T, TextButton, useTheme } from '@/ui';

export type Kind = 'week' | 'month' | 'until';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const PICKS: Record<Kind, number[]> = { month: [800, 1000, 1400, 2000], week: [150, 250, 350, 500], until: [300, 600, 1000, 1400] };
const RENT_PICKS = [350, 450, 600];
// Quick-pick chips at the currency's scale (1,000 ringgit -> 1,500,000 won), labelled without ".00".
const picks = (base: number[], currency: string, fmt: (v: number) => string) =>
  base.map((v) => localAmount(v, currency)).map((v) => ({ value: Math.round(v * 100), label: fmt(v).replace(/[.,]00$/, '') }));

export const toCents = (s: string) => ((n) => (Number.isFinite(n) ? Math.round(n * 100) : 0))(Number(s.trim().replace(',', '.'))); // 0, not NaN, for "1..5"
export const ordinal = (d: number) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`;
export const budgetOf = (kind: 'week' | 'month', cents: number): Budget => ({ cents, period: kind === 'week' ? { kind, startWeekday: 1 } : { kind, startDay: 1 } });
// "week", "month", "pay period": for "this ___" and "next ___".
export const periodWord = (period: BudgetPeriod) => (period.kind === 'until' ? 'pay period' : period.kind);
// "a week", "a month", "until 31 Oct" (the current period's payday; it moves on by itself once one passes).
export function perPeriod(period: BudgetPeriod, locale: string) {
  if (period.kind !== 'until') return `a ${period.kind}`;
  const payday = periodRange(period, today()).nextStart;
  return `until ${new Date(`${payday}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
}
// "1400" or "1400.5" for the pad, from cents.
export const padValue = (cents: number) => (cents ? String(cents / 100) : '');

// The amount ticks up 4 pt when it changes (150 ms); still under Reduce Motion.
function useTick(value: string) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduce && value) y.value = withSequence(withTiming(-4, { duration: 60 }), withTiming(0, { duration: 90 }));
  }, [value, reduce, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

export function BudgetStep({
  kind,
  onKind,
  amount,
  onAmount,
  profile,
  onChangeCurrency,
  onNext,
  nextTitle = 'Next',
  children,
  disabled,
}: {
  kind: Kind;
  /** Without it the period is plain text (the Budget sheet picks it above). */
  onKind?: (k: 'week' | 'month') => void;
  amount: string;
  onAmount: (v: string) => void;
  profile: Profile;
  onChangeCurrency?: () => void;
  onNext: () => void;
  nextTitle?: string;
  /** Extra fields under the amount (the Budget sheet's payday). */
  children?: ReactNode;
  disabled?: boolean;
}) {
  const fmt = (major: number) => money(major, profile.currency, profile.locale);
  const cents = toCents(amount || '0');
  const tick = useTick(amount);
  const other = kind === 'month' ? 'week' : 'month';
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }} accessibilityRole="header">
        {kind === 'until' ? (
          <T variant="title">How much do you have until payday?</T>
        ) : onKind ? (
          <>
            <T variant="title">How much do you have each </T>
            <Pressable onPress={() => onKind(other)} accessibilityRole="button" accessibilityLabel={`Period: ${kind}. Double-tap to switch to ${other}.`} hitSlop={8}>
              <T variant="title" tone="accent" style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>
                {kind}
              </T>
            </Pressable>
            <T variant="title">?</T>
          </>
        ) : (
          <T variant="title">How much do you have each {kind}?</T>
        )}
      </View>
      <T tone="textDim">Everything you have, rent included. Senbud sets rent aside first.</T>
      <Animated.View style={tick}>
        <T variant="hero" money numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={`${fmt(cents / 100)}, adjustable`}>
          {fmt(cents / 100)}
        </T>
      </Animated.View>
      {onChangeCurrency ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T tone="textDim">
            {profile.currency} · {currencyName(profile.currency)}
          </T>
          <TextButton title="Change" onPress={onChangeCurrency} />
        </View>
      ) : null}
      {children}
      <QuickPicks label={kind === 'until' ? 'Quick amounts until payday' : `Quick amounts a ${kind}`} options={picks(PICKS[kind], profile.currency, fmt)} value={cents} onChange={(c) => onAmount(padValue(c))} />
      <AmountPad value={amount} onChange={onAmount} digits={digitsOf(profile.currency, profile.locale)} />
      <Button title={nextTitle} disabled={cents <= 0 || disabled} onPress={onNext} />
    </View>
  );
}

export function RentStep({
  hasRent,
  onHasRent,
  rent,
  onRent,
  dueDay,
  onDueDay,
  profile,
  onNext,
  nextTitle = 'Next',
  error,
}: {
  hasRent: boolean | null;
  onHasRent: (v: boolean) => void;
  rent: string;
  onRent: (v: string) => void;
  dueDay: number;
  onDueDay: (d: number) => void;
  profile: Profile;
  onNext: () => void;
  nextTitle?: string;
  error?: string;
}) {
  const reduce = useReducedMotion();
  const fmt = (major: number) => money(major, profile.currency, profile.locale);
  const cents = toCents(rent || '0');
  return (
    <View style={{ gap: space.md }}>
      <T variant="title" accessibilityRole="header">
        Do you pay rent?
      </T>
      <T tone="textDim">Senbud puts it aside first, so it never counts as spending money.</T>
      <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
        <ChoiceCard title="Yes" hint="I pay rent" selected={hasRent === true} onPress={() => onHasRent(true)} />
        <ChoiceCard title="No rent" hint="Family, hostel or free" selected={hasRent === false} onPress={() => onHasRent(false)} />
      </View>
      {hasRent && (
        <Animated.View layout={reduce ? undefined : LinearTransition.springify()} style={{ gap: space.md }}>
          <T variant="label" tone="textDim">
            How much a month?
          </T>
          <QuickPicks label="Quick rent amounts" options={picks(RENT_PICKS, profile.currency, fmt)} value={cents} onChange={(c) => onRent(padValue(c))} />
          <Field label={`Rent (${profile.currency})`} value={rent} onChangeText={(v) => onRent(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder={typed(450, profile.currency)} error={error} />
          <T variant="label" tone="textDim">
            Due on day
          </T>
          <DayStrip value={dueDay} onChange={onDueDay} ordinal={ordinal} />
          <T variant="caption" tone="textDim">
            Bills like your phone plan can go in later, in Budgets.
          </T>
        </Animated.View>
      )}
      <Button title={nextTitle} disabled={hasRent === null || (hasRent && cents <= 0)} onPress={onNext} />
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
      <T numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.ink, fontFamily: MONO, fontSize: 14, flexShrink: 1 }}>
        {label}
      </T>
      <T money style={{ color: palette.ink, fontFamily: MONO, fontSize: 14 }}>
        {value}
      </T>
    </View>
  );
}

// Bud prints what Senbud just worked out: the budget, rent (if it falls this period) and days left,
// then "Safe to spend today" counts up. Same maths as Home (safeToSpend), from an empty spending list.
export function ReadyStep({ budget, rent, profile, onDone }: { budget: Budget; rent: { cents: number; dueDay: number } | null; profile: Profile; onDone: () => void }) {
  const t = useTheme();
  const [printed, setPrinted] = useState(false);
  const day = today();
  const bills = rent ? [{ name: 'Rent', ...rent, addedOn: day }] : [];
  const safe = safeToSpend({ limit: budget.cents, period: budget.period, transactions: [], bills, today: day });
  const rentThisPeriod = safe.owed;
  const shown = useCountUp(safe.perDay, printed);
  const fmt = (cents: number) => money(cents / 100, profile.currency, profile.locale);
  const dateLabel = new Date().toLocaleDateString(profile.locale, { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View style={{ gap: space.lg, alignItems: 'center' }}>
      <T variant="title" accessibilityRole="header">
        You’re set.
      </T>
      <PrintingBud face="yay" budSize={88} width={280} onPrinted={() => setPrinted(true)}>
        <T variant="caption" style={{ color: palette.inkDim, fontFamily: MONO }}>
          SENBUD · {dateLabel.toUpperCase()}
        </T>
        <Line label={`Budget this ${budget.period.kind}`} value={fmt(budget.cents)} />
        {rent && <Line label={`Rent on the ${ordinal(rent.dueDay)}`} value={rentThisPeriod ? `−${fmt(rentThisPeriod)}` : 'next month'} />}
        <Line label="Days left" value={String(safe.daysLeft)} />
      </PrintingBud>
      <View style={{ alignItems: 'center', gap: space.xs }} accessibilityLabel={`Safe to spend today, ${fmt(safe.perDay)}`} accessible>
        <T variant="label" tone="textDim">
          Safe to spend today
        </T>
        <Marker align="center">
          <T variant="hero" money numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{ color: t.text }}>
            {fmt(shown)}
          </T>
        </Marker>
        <T tone="textDim" style={{ textAlign: 'center' }}>
          That’s your number. It updates every time you add something.
        </T>
      </View>
      <View style={{ alignSelf: 'stretch', gap: space.sm }}>
        <Button title="Go to Home" onPress={onDone} />
        <T variant="caption" tone="textDim" style={{ textAlign: 'center' }}>
          Pay per hour and bills can wait. Add them any time in Settings.
        </T>
      </View>
    </View>
  );
}
