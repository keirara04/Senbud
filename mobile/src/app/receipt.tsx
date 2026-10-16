import { daysBetween, money, type Transaction } from '@senbud/core';
import { motion, space } from '@senbud/core/tokens';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Purchases from 'react-native-purchases';

import { type Receipt, readReceipt } from '@/api';
import { addTransactions, type AppState, deleteTransactions, giveAiConsent, loadApp, loadSetup, type Profile, setPro, today } from '@/db';
import { hasPro, purchasesReady } from '@/purchases';
import { Button, Card, CategoryChip, Row, Screen, T, UndoBar, useTheme } from '@/ui';

type Step =
  | { kind: 'loading' }
  | { kind: 'pro' }
  | { kind: 'consent' }
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
      setStep(!a.pro ? { kind: 'pro' } : a.aiConsentAt ? { kind: 'pick' } : { kind: 'consent' });
      })();
    }, [db, step.kind]),
  );

  const fmt = (n: number) => money(n, profile.currency, profile.locale);

  async function consent() {
    await giveAiConsent(db);
    setStep({ kind: 'pick' });
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
      const receipt = await readReceipt(base64, profile.currency, app.deviceId);
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

  if (step.kind === 'loading') return null;

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

  if (step.kind === 'consent')
    return (
      <Screen>
        <T variant="title">Before your first receipt</T>
        <Card>
          <T>To read a receipt, Senbud sends the photo to its server and on to an AI model (currently Google Gemini) through OpenRouter.</T>
          <T>The photo is used only to read this receipt. Senbud doesn’t store or log it, and only providers that keep no data are used.</T>
          <T tone="textDim" variant="caption">
            Everything else stays on your phone. You can still add expenses by typing.
          </T>
        </Card>
        <Button title="Allow and continue" onPress={consent} />
        <Button title="Not now" variant="secondary" onPress={() => router.back()} />
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
    </Screen>
  );
}
