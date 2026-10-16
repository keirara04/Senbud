import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { loadApp, migrate } from '@/db';
import { ProSync } from '@/purchases';
import { applyTheme, useNavigationTheme } from '@/ui';

// Dark by default, from the first frame. ThemeSync then applies the Light / Dark / System choice from Settings.
applyTheme('dark');

function ThemeSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    loadApp(db).then((a) => applyTheme(a.theme), () => {});
  }, [db]);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={useNavigationTheme()}>
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
          <Stack.Screen name="treat" options={{ title: 'Add a treat', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="currency" options={{ title: 'Currency', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="rate" options={{ title: 'Pay per hour', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="friend" options={{ title: '', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="split" options={{ title: 'Split a bill', presentation: 'modal' }} />
          <Stack.Screen name="add" options={{ title: 'Add by hand', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="pro" options={{ title: 'Senbud Pro', presentation: 'modal' }} />
          {/* A modal, not a formSheet: RNScreens' formSheet lays out a ScrollView with a pinned input row wrongly. */}
          <Stack.Screen name="assistant" options={{ title: 'Bud', presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
