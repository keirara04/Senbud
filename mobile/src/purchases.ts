// Senbud Pro through RevenueCat (App Store / Play Billing). No accounts: RevenueCat makes an anonymous id,
// and Restore works through the person's Apple or Google account. The `pro` column in SQLite is a cache
// of the entitlement, so Pro keeps working offline.
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { setPro } from '@/db';

export const ENTITLEMENT = 'pro';

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

export const hasPro = (info: CustomerInfo) => ENTITLEMENT in info.entitlements.active;

/** Keeps the local Pro cache in step with RevenueCat. Mount once, inside SQLiteProvider. */
export function ProSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    if (!purchasesReady()) return;
    const sync = (info: CustomerInfo) => setPro(db, hasPro(info));
    // Offline or a RevenueCat outage: keep the cached value rather than locking someone out.
    Purchases.getCustomerInfo().then(sync, () => {});
    Purchases.addCustomerInfoUpdateListener(sync);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(sync);
    };
  }, [db]);
  return null;
}
