import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { loadApp, migrate } from '@/db';
import { ProSync } from '@/purchases';
import { applyTheme, useNavigationTheme } from '@/ui';

// The Light / Dark / System choice from Settings, applied at launch.
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
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: 'Budget and rent' }} />
          <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
          <Stack.Screen name="limit" options={{ title: 'Category limit', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="bill" options={{ title: 'Add a bill', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="jar" options={{ title: 'Treat jar', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="treat" options={{ title: 'Add a treat', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="rate" options={{ title: 'Hourly rate', presentation: 'formSheet', sheetAllowedDetents: [0.6], sheetGrabberVisible: true }} />
          <Stack.Screen name="friend" options={{ title: '', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="split" options={{ title: 'Split a bill', presentation: 'modal' }} />
          <Stack.Screen name="add" options={{ title: 'Add by hand', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }} />
          <Stack.Screen name="pro" options={{ title: 'Senbud Pro', presentation: 'modal' }} />
          <Stack.Screen
            name="assistant"
            options={{ title: 'Bud', presentation: 'formSheet', sheetAllowedDetents: [0.92], sheetGrabberVisible: true }}
          />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
