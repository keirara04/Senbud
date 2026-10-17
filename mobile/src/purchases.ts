// Senbud Pro through RevenueCat (App Store / Play Billing). No accounts: RevenueCat makes an anonymous id,
// and Restore works through the person's Apple or Google account. The `pro` column in SQLite is a cache
// of the entitlement, so Pro keeps working offline.
import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { fetchProGrant } from '@/api';
import { loadApp, setPro, setProGrant } from '@/db';

// The entitlement identifier as set in the RevenueCat dashboard.
export const ENTITLEMENT = 'senbud_pro';

// Shown on the paywall (App Store 3.1.2) and in Settings.
export const TERMS = 'https://senbud.com/terms';
export const PRIVACY = 'https://senbud.com/privacy';

// The Test Store key only in debug builds: a release build configured with it crashes on purpose.
// Keys are public SDK keys, read from mobile/.env.local (gitignored) so they're easy to rotate.
const KEY = __DEV__
  ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY
  : Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY });

let configured = false;

/** Configures the SDK once. False when this build has no key (Pro then stays unavailable). */
export function purchasesReady(): boolean {
  if (configured) return true;
  if (!KEY) return false;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: KEY });
  configured = true;
  return true;
}

export function hasPro(info: CustomerInfo) {
  const pro = ENTITLEMENT in info.entitlements.active;
  // A purchase that unlocks nothing usually means the product isn't attached to the "pro" entitlement.
  if (__DEV__ && !pro && info.activeSubscriptions.length)
    console.warn(`[Senbud] active subscriptions ${JSON.stringify(info.activeSubscriptions)} but entitlements are ${JSON.stringify(Object.keys(info.entitlements.all))}; attach the products to "${ENTITLEMENT}" in RevenueCat.`);
  return pro;
}

// The catch: after a dev reload the old database handle is closed; a late update must not throw.
const cachePro = (db: SQLiteDatabase, info: CustomerInfo) => setPro(db, hasPro(info)).catch(() => {});

/** Reads the entitlement into the cache once, e.g. after Erase recreated the app row with Pro off. */
export async function syncPro(db: SQLiteDatabase) {
  if (!purchasesReady()) return;
  // Offline or a RevenueCat outage: keep the cached value rather than locking someone out.
  await Purchases.getCustomerInfo().then((info) => cachePro(db, info), () => {});
}

/** Pro granted from the API's /admin by Support ID. Works on every platform, web included. */
export async function syncGrant(db: SQLiteDatabase) {
  const until = await fetchProGrant((await loadApp(db)).deviceId);
  if (until !== undefined) await setProGrant(db, until).catch(() => {});
}

/** Keeps the local Pro cache in step with RevenueCat and any grant. Mount once, inside SQLiteProvider. */
export function ProSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    syncGrant(db).catch(() => {});
    if (!purchasesReady()) return;
    const sync = (info: CustomerInfo) => cachePro(db, info);
    syncPro(db);
    Purchases.addCustomerInfoUpdateListener(sync);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(sync);
    };
  }, [db]);
  return null;
}

/** "Restore purchases" outside the paywall (Settings, Welcome): ask the store, cache it, say what happened. */
export async function restorePro(db: SQLiteDatabase): Promise<boolean> {
  if (!purchasesReady()) {
    Alert.alert('Not available', 'Purchases aren’t set up in this build.');
    return false;
  }
  try {
    const pro = hasPro(await Purchases.restorePurchases());
    await setPro(db, pro);
    Alert.alert(pro ? 'Senbud Pro restored' : 'Nothing to restore', pro ? undefined : 'No Senbud Pro purchase found on this Apple or Google account.');
    return pro;
  } catch {
    Alert.alert('Couldn’t reach the store', 'Try again in a moment.');
    return false;
  }
}

/** The cached Pro flag (kept fresh by ProSync), re-read whenever the screen gains focus. */
export function usePro() {
  const db = useSQLiteContext();
  const [pro, setProState] = useState(false);
  useFocusEffect(
    useCallback(() => {
      loadApp(db).then((a) => setProState(a.pro));
    }, [db]),
  );
  return pro;
}
