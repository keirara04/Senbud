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
          <Stack.Screen name="index" options={{ title: 'Senbud' }} />
          <Stack.Screen name="setup" options={{ title: 'Budget & rent' }} />
          <Stack.Screen name="activity" options={{ title: 'Activity' }} />
          <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
