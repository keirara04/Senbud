import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { migrate } from '@/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="senbud.db" onInit={migrate}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Senbud' }} />
        <Stack.Screen name="setup" options={{ title: 'Your budget' }} />
        <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      </Stack>
    </SQLiteProvider>
  );
}
