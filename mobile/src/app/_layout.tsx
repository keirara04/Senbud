import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { loadApp, migrate } from '@/db';
import { ProSync } from '@/purchases';
import { applyTheme, Screen, T, useNavigationTheme } from '@/ui';

// Dark by default, from the first frame. ThemeSync then applies the Light / Dark / System choice from Settings.
applyTheme('dark');

// RN-web's Alert.alert does nothing, so on web use the browser's dialogs. Senbud's alerts have at most
// Cancel plus one action.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const action = buttons?.find((b) => b.style !== 'cancel');
    const cancel = buttons?.find((b) => b.style === 'cancel');
    if (!cancel) {
      window.alert(text);
      return void action?.onPress?.();
    }
    (window.confirm(text) ? action : cancel)?.onPress?.();
  };
}

// On web the database file can be open in one tab only (OPFS access handle); a second tab would sit
// blank. Each tab waits for a Web Lock before opening it, says so while it waits, and takes over by
// itself once the other tab closes. The lock is held for the life of the tab.
function useDatabaseTurn() {
  const web = Platform.OS === 'web';
  const [turn, setTurn] = useState<'mine' | 'waiting' | null>(web ? null : 'mine');
  useEffect(() => {
    if (!web) return;
    const hold = () => {
      setTurn('mine');
      return new Promise<void>(() => {});
    };
    if (!navigator.locks) return void Promise.resolve().then(hold);
    navigator.locks.request('senbud-db', { ifAvailable: true }, (lock) => {
      if (lock) return hold();
      setTurn('waiting');
      navigator.locks.request('senbud-db', hold);
    });
  }, [web]);
  return turn;
}

function OpenElsewhere() {
  return (
    <Screen scroll={false}>
      <T variant="title">Senbud is open in another tab</T>
      <T tone="textDim" style={{ marginTop: 8 }}>
        Your data can only be open in one tab at a time. Close the other tab and this one picks up.
      </T>
    </Screen>
  );
}

function ThemeSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    loadApp(db).then((a) => applyTheme(a.theme), () => {});
  }, [db]);
  return null;
}

export default function RootLayout() {
  const turn = useDatabaseTurn();
  const theme = useNavigationTheme();
  // Web: the strip behind the iPhone status bar (see +html.tsx) is the page background, so it follows
  // the app's Light / Dark choice rather than staying night.
  useEffect(() => {
    if (Platform.OS === 'web') document.body.style.backgroundColor = theme.colors.background;
  }, [theme.colors.background]);
  if (turn !== 'mine') return turn === 'waiting' ? <OpenElsewhere /> : null;
  return (
    <ThemeProvider value={theme}>
      <SQLiteProvider databaseName="senbud.db" onInit={migrate}>
        <StatusBar style="auto" />
        <ProSync />
        <ThemeSync />
        <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="welcome-back" options={{ title: 'Welcome back', presentation: 'formSheet', sheetAllowedDetents: [0.6], sheetGrabberVisible: true }} />
          <Stack.Screen name="edit-budget" options={{ title: 'Budget', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="edit-rent" options={{ title: 'Rent', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
          <Stack.Screen name="limit" options={{ title: 'Category limit', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="bill" options={{ title: 'Add a bill', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="jar" options={{ title: 'Treat jar', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="leftover" options={{ title: '', presentation: 'formSheet', sheetAllowedDetents: [0.5], sheetGrabberVisible: true }} />
          <Stack.Screen name="treat" options={{ title: 'Add a treat', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="currency" options={{ title: 'Currency', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="rate" options={{ title: 'Pay per hour', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="friend" options={{ title: '', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="split" options={{ title: 'Split a bill', presentation: 'modal' }} />
          <Stack.Screen name="add" options={{ title: 'Add by hand', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="wrapped" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="share" options={{ title: 'Share', presentation: 'modal' }} />
          <Stack.Screen name="pro" options={{ title: 'Senbud Pro', presentation: 'modal', headerShown: false }} />
          {/* A modal, not a formSheet: RNScreens' formSheet lays out a ScrollView with a pinned input row wrongly. */}
          <Stack.Screen name="assistant" options={{ title: 'Bud', presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
