// First-run setup (design system 4.1c): Budget → Rent → You're set, one route with a step state.
// Nothing is saved until You're set appears, so backing out leaves no half-made budget.
import { space } from '@senbud/core/tokens';
import { getLocales } from 'expo-localization';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadProfile, type Profile, saveSetup, track } from '@/db';
import { budgetOf, BudgetStep, ReadyStep, RentStep, toCents } from '@/onboarding';
import { StepHeader, useTheme } from '@/ui';

type Step = 'budget' | 'rent' | 'ready';

export default function Onboarding() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const device = getLocales()[0];
  const [step, setStep] = useState<Step>('budget');
  const [forward, setForward] = useState(true);
  const [profile, setProfile] = useState<Profile>({ currency: device.currencyCode ?? 'USD', locale: device.languageTag });
  const [kind, setKind] = useState<'week' | 'month'>('month');
  const [amount, setAmount] = useState('');
  const [hasRent, setHasRent] = useState<boolean | null>(null);
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState(1);

  // The currency picker writes the profile row; pick the choice up when it closes.
  useFocusEffect(
    useCallback(() => {
      loadProfile(db).then((p) => p && setProfile((cur) => ({ ...cur, currency: p.currency })));
    }, [db]),
  );

  const go = (next: Step, fwd: boolean) => {
    setForward(fwd);
    setStep(next);
  };
  const budget = budgetOf(kind, toCents(amount || '0'));
  const rentBill = hasRent && toCents(rent) > 0 ? { cents: toCents(rent), dueDay } : null;

  async function finish(withRent: boolean) {
    await saveSetup(db, { budget, rent: withRent ? rentBill && { name: 'Rent', ...rentBill } : null, profile });
    track(db, 'setup_done', { period: budget.period.kind, rent: !!(withRent && rentBill) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (!withRent) setHasRent(false);
    go('ready', true);
  }

  const entering = reduce ? undefined : (forward ? FadeInRight : FadeInLeft).duration(250);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {step !== 'ready' && (
        <View style={{ paddingHorizontal: space.md }}>
          <StepHeader
            step={step === 'budget' ? 1 : 2}
            total={2}
            onBack={() => (step === 'budget' ? router.replace('/welcome') : go('budget', false))}
            onSkip={step === 'rent' ? () => finish(false) : undefined}
          />
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: insets.bottom + space.lg }} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={entering}>
          {step === 'budget' && (
            <BudgetStep kind={kind} onKind={setKind} amount={amount} onAmount={setAmount} profile={profile} onChangeCurrency={() => router.push('/currency')} onNext={() => go('rent', true)} />
          )}
          {step === 'rent' && (
            <RentStep hasRent={hasRent} onHasRent={setHasRent} rent={rent} onRent={setRent} dueDay={dueDay} onDueDay={setDueDay} profile={profile} onNext={() => finish(!!hasRent)} />
          )}
          {step === 'ready' && <ReadyStep budget={budget} rent={hasRent ? rentBill : null} profile={profile} onDone={() => router.replace('/')} />}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
