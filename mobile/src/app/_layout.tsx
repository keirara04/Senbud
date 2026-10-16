import { Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrate } from '@/db';
import { ProSync } from '@/purchases';
import { useNavigationTheme } from '@/ui';

export default function RootLayout() {
  return (
    <ThemeProvider value={useNavigationTheme()}>
      <SQLiteProvider databaseName="senbud.db" onInit={migrate}>
        <StatusBar style="auto" />
        <ProSync />
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: 'Budget and rent' }} />
          <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
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
