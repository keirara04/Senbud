import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { migrate } from '@/db';
import { useHeaderOptions } from '@/ui';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="senbud.db" onInit={migrate}>
      <StatusBar style="auto" />
      <Stack screenOptions={useHeaderOptions()}>
        <Stack.Screen name="index" options={{ title: 'Senbud' }} />
        <Stack.Screen name="setup" options={{ title: 'Budget & rent' }} />
        <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      </Stack>
    </SQLiteProvider>
  );
}
