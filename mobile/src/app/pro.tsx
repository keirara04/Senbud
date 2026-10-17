// Senbud Pro paywall. Prices and periods always come from the store via RevenueCat, never from code.
// App Store 3.1.2: price, renewal terms, Terms and Privacy links and Restore are all on this screen.
// The hero is Bud printing a "Senbud Pro" receipt; the only numbers on it come from the store's prices.
import { money } from '@senbud/core';
import { palette, radius, space, touch } from '@senbud/core/tokens';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRINT_MS, PrintingBud } from '@/art';
import { loadSetup, setPro, track } from '@/db';
import { hasPro, PRIVACY, purchasesReady, TERMS } from '@/purchases';
import { Button, Icon, type IconName, Row, Screen, T, TextButton, useTheme } from '@/ui';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const BENEFITS: [IconName, string, string][] = [
  [{ ios: 'camera.fill', android: 'photo_camera' }, 'Snap receipts', 'Take a photo and it’s added and sorted.'],
  [{ ios: 'bubble.left.fill', android: 'chat' }, 'Unlimited AI assistant', 'Ask “can I afford it?” as often as you like.'],
  [{ ios: 'bell.fill', android: 'notifications' }, 'Subscription reminders', 'See what renews before you’re charged.'],
];

const PERIOD: Partial<Record<PACKAGE_TYPE, { name: string; per: string }>> = {
  [PACKAGE_TYPE.ANNUAL]: { name: 'Yearly', per: 'a year' },
  [PACKAGE_TYPE.MONTHLY]: { name: 'Monthly', per: 'a month' },
};

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; packages: PurchasesPackage[]; selected: string; busy: boolean; note?: string };

export default function ProScreen() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [locale, setLocale] = useState('en-US');

  // Every setState sits in a then/catch, so the mount effect can call this (state starts as loading).
  const load = useCallback(
    () =>
      (purchasesReady() ? Purchases.getOfferings() : Promise.reject(new Error('unavailable'))).then(
        (offerings): State => {
          const packages = offerings.current?.availablePackages.filter((p) => PERIOD[p.packageType]) ?? [];
          if (!packages.length) return { kind: 'error', message: 'Senbud Pro isn’t on sale right now. Try again later.' };
          // Yearly first and preselected.
          const annual = (p: PurchasesPackage) => (p.packageType === PACKAGE_TYPE.ANNUAL ? 0 : 1);
          packages.sort((a, b) => annual(a) - annual(b));
          return { kind: 'ready', packages, selected: packages[0].identifier, busy: false };
        },
        (e: Error): State => ({
          kind: 'error',
          message: e.message === 'unavailable' ? 'Senbud Pro isn’t available in this build yet.' : 'Couldn’t load Senbud Pro. Check your connection and try again.',
        }),
      ).then(setState),
    [],
  );

  useEffect(() => {
    loadSetup(db).then((s) => s && setLocale(s.profile.locale));
    load();
  }, [db, load]);

  // On the ready screen a note sits under the plans; on the error screen it replaces the message.
  const busy = (b: boolean, note?: string) =>
    setState((s) => (s.kind === 'ready' ? { ...s, busy: b, note } : note ? { kind: 'error', message: note } : s));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function unlockedOrNote(isPro: boolean, note: string) {
    await setPro(db, isPro);
    // Opened over another screen: go back to it. Opened directly (deep link): there's nothing behind us.
    if (isPro) return close();
    busy(false, note);
  }

  async function restore() {
    if (!purchasesReady()) return busy(false, 'Senbud Pro isn’t available in this build yet.');
    busy(true);
    try {
      await unlockedOrNote(hasPro(await Purchases.restorePurchases()), 'No Senbud Pro purchase found on this Apple or Google account.');
    } catch {
      busy(false, 'Couldn’t reach the store to restore. Try again.');
    }
  }

  if (state.kind === 'loading')
    return (
      <Screen>
        <ActivityIndicator size="large" color={t.accent} style={{ marginTop: space.xxl + insets.top }} />
      </Screen>
    );

  if (state.kind === 'error')
    return (
      <Screen>
        <View style={{ height: insets.top }} />
        <T variant="title">Senbud Pro</T>
        <T tone="textDim">{state.message}</T>
        <Button
          title="Try again"
          onPress={() => {
            setState({ kind: 'loading' });
            return load();
          }}
        />
        <TextButton title="Restore purchases" onPress={restore} />
        <TextButton title="Not now" tone="textDim" onPress={close} />
      </Screen>
    );

  const ready = state;
  const annual = ready.packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const monthly = ready.packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  // Both from the store's prices: what a year costs against twelve months, and the year per day.
  const savePct = annual && monthly && monthly.product.price > 0 ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100) : 0;
  const perDay = annual ? money(annual.product.price / 365, annual.product.currencyCode, locale) : null;
  const rise = (n: number) => (reduce ? undefined : FadeInDown.delay(PRINT_MS + 120 * n).duration(380));
  const ink = { color: palette.ink, fontFamily: MONO, fontSize: 14 };

  async function buy() {
    const pkg = ready.packages.find((p) => p.identifier === ready.selected);
    if (!pkg) return;
    busy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (hasPro(customerInfo)) track(db, 'pro_bought', { plan: pkg.packageType });
      await unlockedOrNote(hasPro(customerInfo), 'The purchase went through but didn’t unlock Pro. Try Restore purchases.');
    } catch (e) {
      // Closing the store sheet is a choice, not an error.
      if ((e as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return busy(false);
      busy(false, 'The purchase didn’t go through. You haven’t been charged. Try again.');
    }
  }

  const sel = ready.packages.find((p) => p.identifier === ready.selected);
  const selectedPrice = sel ? `${sel.product.priceString} ${PERIOD[sel.packageType]!.per}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Screen>
      {/* Hero: Bud prints what Pro includes, on the cobalt panel. */}
      <View style={{ backgroundColor: t.panel, borderRadius: radius.lg, paddingTop: insets.top > 30 ? space.md : space.lg, paddingBottom: space.lg, paddingHorizontal: space.md, gap: space.md, overflow: 'hidden', marginTop: insets.top > 30 ? 0 : space.sm }}>
        <Glow reduce={reduce} />
        <Row>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ backgroundColor: palette.highlighter, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
              <T variant="label" style={{ color: palette.ink }}>
                PRO
              </T>
            </View>
            <T variant="label" tone="onPanelDim">
              Senbud
            </T>
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={{ width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Icon name={{ ios: 'xmark', android: 'close' }} size={18} color={palette.onCobalt} />
          </Pressable>
        </Row>
        <T variant="title" tone="onPanel" accessibilityRole="header">
          Let Bud do the typing.
        </T>
        <View accessible accessibilityLabel={`Senbud Pro includes snap receipts, an unlimited assistant and renewal alerts${perDay ? `. Yearly is about ${perDay} a day` : ''}.`}>
          <PrintingBud face="yay" budSize={72} width={260}>
            <T variant="caption" style={{ color: palette.inkDim, fontFamily: MONO }}>
              SENBUD PRO · RECEIPT
            </T>
            {['Snap receipts', 'Unlimited Bud', 'Renewal alerts'].map((l) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T style={ink}>{l}</T>
                <T style={ink}>included</T>
              </View>
            ))}
            {perDay ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderStyle: 'dashed', borderColor: palette.inkDim, paddingTop: space.xs }}>
                <T variant="bodyStrong" style={ink}>
                  Yearly
                </T>
                <View style={{ backgroundColor: palette.highlighter, borderRadius: 4, paddingHorizontal: 4 }}>
                  <T variant="bodyStrong" money style={ink}>
                    ~{perDay} a day
                  </T>
                </View>
              </View>
            ) : null}
          </PrintingBud>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        {BENEFITS.map(([icon, title, body], i) => (
          <Animated.View key={title} entering={rise(i)} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: t.panel, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={20} color={palette.highlighter} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="bodyStrong">{title}</T>
              <T variant="caption" tone="textDim">
                {body}
              </T>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={rise(3)} accessibilityRole="radiogroup" style={{ gap: space.md, paddingTop: space.sm }}>
        {ready.packages.map((p) => {
          const period = PERIOD[p.packageType]!;
          // The store's own formatting, so it matches priceString; our maths only as a fallback.
          const perMonth =
            p.packageType === PACKAGE_TYPE.ANNUAL ? `${p.product.pricePerMonthString ?? money(p.product.price / 12, p.product.currencyCode, locale)} a month` : null;
          return (
            <PlanCard
              key={p.identifier}
              name={period.name}
              price={`${p.product.priceString} ${period.per}`}
              sub={perMonth}
              badge={p.packageType === PACKAGE_TYPE.ANNUAL && savePct > 0 ? `Best value · save ${savePct}%` : null}
              on={p.identifier === ready.selected}
              disabled={ready.busy}
              onPress={() => setState({ ...ready, selected: p.identifier, note: undefined })}
            />
          );
        })}
      </Animated.View>

      {ready.note ? (
        <T variant="caption" tone="bad" accessibilityLiveRegion="polite">
          {ready.note}
        </T>
      ) : null}

      <Row style={{ justifyContent: 'center' }}>
        <TextButton title="Terms" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(TERMS)} />
        <TextButton title="Privacy" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(PRIVACY)} />
        <TextButton title="Restore purchases" tone="textDim" onPress={restore} />
      </Row>
      </Screen>

      {/* Pinned, so the price and the button are always in view together. */}
      <Animated.View entering={rise(4)} style={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), gap: space.xs, backgroundColor: t.bg, borderTopWidth: 1, borderColor: t.line }}>
        <ShineButton title={ready.busy ? 'One moment…' : `Get Senbud Pro · ${selectedPrice}`} disabled={ready.busy} onPress={buy} reduce={reduce} />
        <T variant="caption" tone="textDim" style={{ textAlign: 'center' }}>
          Renews automatically until you cancel. Cancel any time in your App Store or Google Play settings.
        </T>
      </Animated.View>
    </View>
  );
}

// One plan. The selected one lifts a little with a spring and gets a filled radio; Yearly carries the badge.
function PlanCard({ name, price, sub, badge, on, disabled, onPress }: { name: string; price: string; sub: string | null; badge: string | null; on: boolean; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const scale = useSharedValue(on ? 1.02 : 1);
  useEffect(() => {
    scale.value = reduce ? (on ? 1.02 : 1) : withSpring(on ? 1.02 : 1, { damping: 14, stiffness: 220 });
  }, [on, reduce, scale]);
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={lift}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: on, disabled }}
        accessibilityLabel={`${name}, ${price}${sub ? `, ${sub}` : ''}${badge ? `, ${badge}` : ''}`}
        disabled={disabled}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={{ borderRadius: radius.md, borderWidth: 2, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.surfaceSunken : t.surface, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? t.accent : t.textDim, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: t.accent }} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="bodyStrong">{name}</T>
          {sub ? (
            <T variant="caption" tone="good">
              {sub}
            </T>
          ) : null}
        </View>
        <T variant="bodyStrong" money>
          {price}
        </T>
      </Pressable>
      {badge ? (
        <View style={{ position: 'absolute', top: -11, right: space.md, backgroundColor: palette.highlighter, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
          <T variant="caption" style={{ color: palette.ink, fontWeight: '700' }}>
            {badge}
          </T>
        </View>
      ) : null}
    </Animated.View>
  );
}

// The buy button with one shine sweeping across it after the receipt has printed. Once, never a loop.
function ShineButton({ title, disabled, onPress, reduce }: { title: string; disabled: boolean; onPress: () => void; reduce: boolean }) {
  const x = useSharedValue(-120);
  useEffect(() => {
    if (!reduce) x.value = withDelay(PRINT_MS + 700, withTiming(460, { duration: 900 }));
  }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '18deg' }] }));
  return (
    <View style={{ borderRadius: radius.sm, overflow: 'hidden' }}>
      <Button title={title} variant="highlight" disabled={disabled} onPress={onPress} />
      {!reduce && <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -20, bottom: -20, width: 48, backgroundColor: 'rgba(255,255,255,0.55)' }, sweep]} />}
    </View>
  );
}

// Two soft lights drifting into place behind the hero, once.
function Glow({ reduce }: { reduce: boolean }) {
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withTiming(1, { duration: 1400 });
  }, [reduce, p]);
  const a = useAnimatedStyle(() => ({ opacity: 0.35 * p.value, transform: [{ translateX: 40 - 40 * p.value }, { translateY: -30 + 30 * p.value }] }));
  const b = useAnimatedStyle(() => ({ opacity: 0.22 * p.value, transform: [{ translateX: -30 + 30 * p.value }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -60, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: palette.onCobaltDim }, a]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: -70, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: palette.highlighter }, b]} />
    </>
  );
}
