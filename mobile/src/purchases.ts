// Senbud Pro through RevenueCat (App Store / Play Billing). No accounts: RevenueCat makes an anonymous id,
// and Restore works through the person's Apple or Google account. The `pro` column in SQLite is a cache
// of the entitlement, so Pro keeps working offline.
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { setPro } from '@/db';

// The entitlement identifier as set in the RevenueCat dashboard.
export const ENTITLEMENT = 'senbud_pro';

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

/** Keeps the local Pro cache in step with RevenueCat. Mount once, inside SQLiteProvider. */
export function ProSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    if (!purchasesReady()) return;
    // The catch: after a dev reload the old database handle is closed; a late update must not throw.
    const sync = (info: CustomerInfo) => setPro(db, hasPro(info)).catch(() => {});
    // Offline or a RevenueCat outage: keep the cached value rather than locking someone out.
    Purchases.getCustomerInfo().then(sync, () => {});
    Purchases.addCustomerInfoUpdateListener(sync);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(sync);
    };
  }, [db]);
  return null;
}
