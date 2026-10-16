import { daysBetween, money, type Transaction, withCharges } from '@senbud/core';
import { motion, space } from '@senbud/core/tokens';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Purchases from 'react-native-purchases';

import { type Receipt, readReceipt, WEB, WEB_FREE } from '@/api';
import { addTransactions, type AppState, deleteTransactions, loadApp, loadSetup, type Profile, setPro, today } from '@/db';
import { askAiConsent } from '@/consent';
import { hasPro, purchasesReady } from '@/purchases';
import { Button, Card, CategoryChip, Row, Screen, T, UndoBar, useTheme } from '@/ui';

type Step =
  | { kind: 'loading' }
  | { kind: 'pro' }
  | { kind: 'aiOff' }
  | { kind: 'asking' }
  | { kind: 'declined' }
  | { kind: 'pick'; error?: string }
  | { kind: 'reading' }
  | { kind: 'review'; receipt: Receipt; keep: boolean[] }
  | { kind: 'saved'; ids: number[]; summary: string };

// A printed date is used if it's a real day in the last two months; otherwise the expense is today's.
function receiptDate(date: string | null, now: string) {
  if (!date) return now;
  const age = daysBetween(date, now);
  return Number.isFinite(age) && age >= 0 && age <= 62 ? date : now;
}

export default function ReceiptScreen() {
  const db = useSQLiteContext();
  const t = useTheme();
  const [app, setApp] = useState<AppState | null>(null);
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  // On focus, so coming back from the paywall re-checks Pro. Only from the gate or first load:
  // returning from the photo picker mustn't reset a flow in progress.
  useFocusEffect(
    useCallback(() => {
      if (step.kind !== 'loading' && step.kind !== 'pro') return;
      (async () => {
      const a = await loadApp(db);
      const s = await loadSetup(db);
      if (s) setProfile(s.profile);
      // Ask RevenueCat when it's set up: on a fresh launch the cached flag may not be synced yet.
      // Offline, fall back to the cache so Pro keeps working.
      if (purchasesReady()) {
        try {
          a.pro = hasPro(await Purchases.getCustomerInfo());
          await setPro(db, a.pro);
        } catch {}
      }
      setApp(a);
      // The web app can't sell Pro yet; it gets a few free receipts a day instead (the API counts them).
      if (!a.pro && !WEB) return setStep({ kind: 'pro' });
      if (!a.aiEnabled) return setStep({ kind: 'aiOff' });
      if (!a.aiConsentAt) return allowAi();
      setStep({ kind: 'pick' });
      })();
    }, [db, step.kind]),
  );

  const fmt = (n: number) => money(n, profile.currency, profile.locale);

  // First AI use: the one "Bud uses AI" sheet. 'asking' keeps the focus effect from asking again when
  // the sheet closes.
  async function allowAi() {
    setStep({ kind: 'asking' });
    setStep({ kind: (await askAiConsent()) ? 'pick' : 'declined' });
  }

  async function pick(source: 'camera' | 'library') {
    // Only the camera needs permission. The system photo picker shares just the one photo chosen, so
    // asking for the whole library would be needless (and iOS would show a full-access prompt).
    if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
      return setStep({ kind: 'pick', error: 'Senbud needs camera access for this. You can allow it in Settings, or choose a photo instead.' });
    const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const picked = await launch({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !app) return;

    setStep({ kind: 'reading' });
    try {
      // ~1280px JPEG keeps receipt text legible and the upload around 200–400 KB. Also turns HEIC into JPEG.
      const ref = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: 1280 }).renderAsync();
      const { base64 } = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      if (!base64) throw new Error('Couldn’t prepare that photo. Try another one.');
      const read = await readReceipt(base64, profile.currency, app.deviceId);
      // Service charge and SST become their own line, so the saved amount matches the printed total.
      const receipt = { ...read, items: withCharges(read.items, read.total) };
      if (!receipt.items.length) return setStep({ kind: 'pick', error: 'No items found. Try a sharper photo of the whole receipt.' });
      setStep({ kind: 'review', receipt, keep: receipt.items.map(() => true) });
    } catch (e) {
      setStep({ kind: 'pick', error: e instanceof Error ? e.message : 'Something went wrong. Try again.' });
    }
  }

  async function save(receipt: Receipt, keep: boolean[]) {
    const date = receiptDate(receipt.date, today());
    const rows: Transaction[] = receipt.items
      .filter((_, i) => keep[i])
      .map((i) => ({ date, cents: Math.round(i.amount * 100), label: i.label, category: i.category, source: 'photo' }));
    if (!rows.length) return;
    const ids = await addTransactions(db, rows);
    const total = fmt(rows.reduce((s, r) => s + r.cents, 0) / 100);
    setStep({ kind: 'saved', ids, summary: rows.length === 1 ? `Added ${rows[0].label}, ${total}` : `Added ${rows.length} items, ${total}` });
    undoTimer.current = setTimeout(() => router.back(), motion.undoMs);
  }

  async function undo(ids: number[]) {
    clearTimeout(undoTimer.current);
    await deleteTransactions(db, ids);
    setStep({ kind: 'pick' });
  }

  if (step.kind === 'loading' || step.kind === 'asking') return null;

  if (step.kind === 'pro')
    return (
      <Screen>
        <T variant="title">Snap a receipt</T>
        <T tone="textDim">Senbud reads the shop, items and prices from a photo, so you don’t type them. It’s part of Senbud Pro.</T>
        {purchasesReady() ? (
          <>
            <Button title="See Senbud Pro" variant="highlight" onPress={() => router.push('/pro')} />
          </>
        ) : (
          <Card>
            <T variant="bodyStrong">Pro is coming soon</T>
            <T variant="caption" tone="textDim">
              Until then, type what you spent on Home, like “lunch 12, uber 8”.
            </T>
          </Card>
        )}
        <T variant="caption" tone="textDim">
          Typing expenses, budgets and rent stay free.
        </T>
      </Screen>
    );

  if (step.kind === 'aiOff')
    return (
      <Screen>
        <T variant="title">AI is off</T>
        <T tone="textDim">Reading a receipt needs AI. You turned it off in Settings, so nothing is sent.</T>
        <Button title="Turn it on in Settings" onPress={() => router.navigate('/settings')} />
        <Button title="Type it instead" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );

  if (step.kind === 'declined')
    return (
      <Screen>
        <T variant="title">Reading a receipt needs AI</T>
        <T tone="textDim">Nothing was sent. You can type what you spent instead.</T>
        <Button title="Type it instead" onPress={() => router.back()} />
        <Button title="Use AI" variant="secondary" onPress={allowAi} />
      </Screen>
    );

  if (step.kind === 'reading')
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xxl }} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={t.accent} />
          <T tone="textDim">Reading your receipt…</T>
        </View>
      </Screen>
    );

  if (step.kind === 'review') {
    const { receipt, keep } = step;
    const kept = receipt.items.filter((_, i) => keep[i]);
    const other = receipt.currency && receipt.currency !== profile.currency;
    return (
      <Screen>
        <T variant="title">{receipt.merchant ?? 'Your receipt'}</T>
        {other ? (
          <T variant="caption" tone="warn">
            This receipt is in {receipt.currency}. Amounts are saved as they are, in {profile.currency}.
          </T>
        ) : null}
        <Card>
          {receipt.items.map((item, i) => (
            <Pressable
              key={i}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: keep[i] }}
              accessibilityLabel={`${item.label}, ${fmt(item.amount)}`}
              onPress={() => setStep({ ...step, keep: keep.map((k, j) => (j === i ? !k : k)) })}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : keep[i] ? 1 : 0.45, paddingVertical: space.xs })}
            >
              <Row>
                <View style={{ flexGrow: 1, flexBasis: 160, gap: space.xs }}>
                  <T variant="bodyStrong" style={!keep[i] && { textDecorationLine: 'line-through' }}>
                    {item.label}
                  </T>
                  <CategoryChip category={item.category} />
                </View>
                <T variant="bodyStrong" money>
                  {fmt(item.amount)}
                </T>
              </Row>
            </Pressable>
          ))}
        </Card>
        <T variant="caption" tone="textDim">
          Tap an item to leave it out.
        </T>
        <Button
          title={kept.length ? `Add ${kept.length} ${kept.length === 1 ? 'item' : 'items'}, ${fmt(kept.reduce((s, i) => s + i.amount, 0))}` : 'Nothing selected'}
          disabled={!kept.length}
          onPress={() => save(receipt, keep)}
        />
        <Button
          title="Split this with friends"
          variant="secondary"
          disabled={!kept.length}
          onPress={() =>
            router.push({
              pathname: '/split',
              params: {
                merchant: receipt.merchant ?? undefined,
                items: JSON.stringify(kept.map((i) => ({ label: i.label, cents: Math.round(i.amount * 100), category: i.category }))),
              },
            })
          }
        />
        <Button title="Try another photo" variant="secondary" onPress={() => setStep({ kind: 'pick' })} />
      </Screen>
    );
  }

  if (step.kind === 'saved')
    return (
      <Screen>
        <T variant="title">Added</T>
        <UndoBar message={step.summary} onUndo={() => undo(step.ids)} />
        <Button title="Done" onPress={() => router.back()} />
      </Screen>
    );

  return (
    <Screen>
      <T variant="title">Snap a receipt</T>
      <T tone="textDim">Senbud reads the items and prices. You check them before anything is saved.</T>
      {step.error ? (
        <T variant="caption" tone="bad">
          {step.error}
        </T>
      ) : null}
      <Button title="Take a photo" onPress={() => pick('camera')} />
      <Button title="Choose from photos" variant="secondary" onPress={() => pick('library')} />
      {WEB && !app?.pro ? (
        <T variant="caption" tone="textDim" style={{ textAlign: 'center' }}>
          On the web you get {WEB_FREE.receipts} free receipts a day.
        </T>
      ) : null}
    </Screen>
  );
}
