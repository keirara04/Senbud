import { router, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { useLeftoverCheck } from '@/money';
import { BudTab, Icon, type IconName, useTheme } from '@/ui';

// The current tab gets more than a colour, so it still reads without colour vision and while a slow
// screen is drawing: a soft pill in the tab colour behind the icon, and the filled symbol on iOS
// (Android and web draw Material Symbols from an outline-only font, so the pill is their cue).
const icon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: unknown; focused: boolean }) {
    const t = useTheme();
    const tint = typeof color === 'string' ? color : undefined;
    return (
      <View style={{ width: 56, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? `${t.tabActive}2e` : 'transparent' }}>
        <Icon name={focused ? { ...name, ios: `${name.ios}.fill` as IconName['ios'] } : name} color={tint} />
      </View>
    );
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
        tabBarActiveTintColor: t.tabActive,
        tabBarInactiveTintColor: t.textDim,
        // Web gets no safe-area inset from React Navigation, and its 49 pt default clips the labels.
        // 60: BudTab's circle and label take 56, plus the top border.
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, ...(Platform.OS === 'web' && { height: 60 }) },
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
