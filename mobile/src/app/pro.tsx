// Senbud Pro paywall. Prices and periods always come from the store via RevenueCat, never from code.
// App Store 3.1.2: price, renewal terms, Terms and Privacy links and Restore are all on this screen.
import { money } from '@senbud/core';
import { radius, space } from '@senbud/core/tokens';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Purchases, { PACKAGE_TYPE, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

import { loadSetup, setPro } from '@/db';
import { hasPro, purchasesReady } from '@/purchases';
import { Button, Card, Row, Screen, T, TextButton, useTheme } from '@/ui';

const TERMS = 'https://senbud.app/terms';
const PRIVACY = 'https://senbud.app/privacy';

const BENEFITS = [
  ['📸', 'Snap receipts', 'Take a photo and it’s added and sorted.'],
  ['💬', 'Unlimited AI assistant', 'Ask “can I afford it?” as often as you like.'],
  ['🔔', 'Subscription reminders', 'See what renews before you’re charged.'],
] as const;

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
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [locale, setLocale] = useState('en-US');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!purchasesReady()) return setState({ kind: 'error', message: 'Senbud Pro isn’t available in this build yet.' });
    try {
      const packages = (await Purchases.getOfferings()).current?.availablePackages.filter((p) => PERIOD[p.packageType]) ?? [];
      if (!packages.length) return setState({ kind: 'error', message: 'Senbud Pro isn’t on sale right now. Try again later.' });
      // Yearly first and preselected.
      const annual = (p: PurchasesPackage) => (p.packageType === PACKAGE_TYPE.ANNUAL ? 0 : 1);
      packages.sort((a, b) => annual(a) - annual(b));
      setState({ kind: 'ready', packages, selected: packages[0].identifier, busy: false });
    } catch {
      setState({ kind: 'error', message: 'Couldn’t load Senbud Pro. Check your connection and try again.' });
    }
  }, []);

  useEffect(() => {
    loadSetup(db).then((s) => s && setLocale(s.profile.locale));
    load();
  }, [db, load]);

  // On the ready screen a note sits under the plans; on the error screen it replaces the message.
  const busy = (b: boolean, note?: string) =>
    setState((s) => (s.kind === 'ready' ? { ...s, busy: b, note } : note ? { kind: 'error', message: note } : s));

  async function unlockedOrNote(isPro: boolean, note: string) {
    await setPro(db, isPro);
    if (isPro) return router.back();
    busy(false, note);
  }

  async function restore() {
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
        <ActivityIndicator size="large" color={t.accent} style={{ marginTop: space.xxl }} />
      </Screen>
    );

  if (state.kind === 'error')
    return (
      <Screen>
        <T variant="title">Senbud Pro</T>
        <T tone="textDim">{state.message}</T>
        <Button title="Try again" onPress={load} />
        <TextButton title="Restore purchases" onPress={restore} />
      </Screen>
    );

  const ready = state;

  async function buy() {
    const pkg = ready.packages.find((p) => p.identifier === ready.selected);
    if (!pkg) return;
    busy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await unlockedOrNote(hasPro(customerInfo), 'The purchase went through but didn’t unlock Pro. Try Restore purchases.');
    } catch (e) {
      // Closing the store sheet is a choice, not an error.
      if ((e as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return busy(false);
      busy(false, 'The purchase didn’t go through. You haven’t been charged. Try again.');
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <T variant="label" tone="textDim">
          Senbud Pro
        </T>
        <T variant="title" accessibilityRole="header">
          Senbud Pro does the typing for you
        </T>
      </View>

      <Card>
        {BENEFITS.map(([icon, title, body]) => (
          <Row key={title} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
            <T variant="heading" accessibilityElementsHidden importantForAccessibility="no">
              {icon}
            </T>
            <View style={{ flex: 1, gap: space.xxs }}>
              <T variant="bodyStrong">{title}</T>
              <T variant="caption" tone="textDim">
                {body}
              </T>
            </View>
          </Row>
        ))}
      </Card>

      <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
        {ready.packages.map((p) => {
          const on = p.identifier === ready.selected;
          const period = PERIOD[p.packageType]!;
          // The store's own formatting, so it matches priceString; our maths only as a fallback.
          const perMonth =
            p.packageType === PACKAGE_TYPE.ANNUAL
              ? `${p.product.pricePerMonthString ?? money(p.product.price / 12, p.product.currencyCode, locale)} a month`
              : null;
          return (
            <Pressable
              key={p.identifier}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: ready.busy }}
              accessibilityLabel={`${period.name}, ${p.product.priceString} ${period.per}${perMonth ? `, ${perMonth}` : ''}`}
              disabled={ready.busy}
              onPress={() => setState({ ...ready, selected: p.identifier, note: undefined })}
              style={{
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: on ? t.accent : t.line,
                backgroundColor: t.surface,
                padding: space.md,
              }}
            >
              <Row>
                <View style={{ gap: space.xxs }}>
                  <T variant="bodyStrong">{period.name}</T>
                  {perMonth ? (
                    <T variant="caption" tone="good">
                      {perMonth}
                    </T>
                  ) : null}
                </View>
                <T variant="bodyStrong" money>
                  {p.product.priceString} {period.per}
                </T>
              </Row>
            </Pressable>
          );
        })}
      </View>

      {ready.note ? (
        <T variant="caption" tone="bad" accessibilityLiveRegion="polite">
          {ready.note}
        </T>
      ) : null}

      <Button title={ready.busy ? 'One moment…' : 'Continue'} variant="highlight" disabled={ready.busy} onPress={buy} />

      <T variant="caption" tone="textDim" style={{ textAlign: 'center' }}>
        Renews automatically until you cancel. Cancel any time in your App Store or Google Play settings.
      </T>
      <Row style={{ justifyContent: 'center' }}>
        <TextButton title="Terms" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(TERMS)} />
        <TextButton title="Privacy" tone="textDim" onPress={() => WebBrowser.openBrowserAsync(PRIVACY)} />
        <TextButton title="Restore purchases" tone="textDim" onPress={restore} />
      </Row>
    </Screen>
  );
}
