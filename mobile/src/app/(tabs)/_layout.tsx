import { router, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useLeftoverCheck } from '@/money';
import { BudTab, Icon, type IconName, useTheme } from '@/ui';

const icon = (name: IconName) =>
  function TabIcon({ color }: { color: unknown }) {
    return <Icon name={name} color={typeof color === 'string' ? color : undefined} />;
  };

// Five slots (design system 4.1): four tabs plus Bud raised in the middle. Bud opens the assistant
// sheet over the current screen and never switches tabs.
export default function TabsLayout() {
  const t = useTheme();
  useLeftoverCheck();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textDim,
        // Web gets no safe-area inset from React Navigation, and its 49 pt default clips the labels.
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, ...(Platform.OS === 'web' && { height: 56 }) },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="(home)" options={{ title: 'Home', headerShown: false, tabBarIcon: icon({ ios: 'house', android: 'home' }) }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: icon({ ios: 'chart.bar', android: 'bar_chart' }) }} />
      <Tabs.Screen
        name="bud"
        options={{ title: 'Bud', tabBarButton: () => <BudTab onPress={() => router.push('/assistant')} /> }}
      />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: icon({ ios: 'person.2', android: 'group' }) }} />
      <Tabs.Screen name="treats" options={{ title: 'Treats', tabBarIcon: icon({ ios: 'gift', android: 'redeem' }) }} />
    </Tabs>
  );
}
