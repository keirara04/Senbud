import { Stack } from 'expo-router';

// Home's own stack, so screens pushed from Home (Activity, Can I afford it?, Settings) keep the tab bar.
export default function HomeStack() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: '' }} />
      <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="afford" options={{ title: 'Can I afford it?' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
