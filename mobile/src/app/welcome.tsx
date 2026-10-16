// Welcome v2 (design system 4.1b): first launch. No sign-in wall: Senbud has no accounts, so "Get started"
// goes straight to onboarding and "I've used Senbud before" opens a sheet that brings data back.
import { money } from '@senbud/core';
import { palette, radius, space } from '@senbud/core/tokens';
import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { PRINT_MS, PrintingBud, useCountUp } from '@/art';
import { SMALL_UNIT } from '@/currencies';
import { Button, Marker, Screen, T, TextButton, useTheme } from '@/ui';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const PROMISES = ['No bank login', 'No account', 'Stays on your phone'];
const SAMPLE = 5937; // RM 1,400 a month, rent 450 on the 28th, on 16 Oct: the onboarding worked example

export default function Welcome() {
  const t = useTheme();
  const reduce = useReducedMotion();
  const device = getLocales()[0];
  const [printed, setPrinted] = useState(false);
  const shown = useCountUp(SAMPLE, printed);
  // The example is student-sized, so it's shown in ringgit unless the phone's currency is on that scale.
  const sample = device.currencyCode && SMALL_UNIT.has(device.currencyCode) ? device.currencyCode : 'MYR';
  const fmt = (cents: number) => money(cents / 100, sample, device.languageTag);
  // Text rises in reading order once the receipt is out, 100 ms apart.
  const rise = (n: number) => (reduce ? undefined : FadeInDown.delay(PRINT_MS + 100 * n).duration(350));
  const ink = { color: palette.ink, fontFamily: MONO, fontSize: 15 };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityRole="header" accessibilityLabel="Senbud">
          <T variant="hero">Sen</T>
          <Marker>
            <T variant="hero">bud</T>
          </Marker>
        </View>

        <View accessible accessibilityLabel={`For example, safe to spend ${fmt(SAMPLE)}`}>
          <PrintingBud budSize={120} width={270} onPrinted={() => setPrinted(true)}>
            <T variant="caption" style={{ color: palette.inkDim, fontFamily: MONO }}>
              FOR EXAMPLE · TODAY
            </T>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T style={ink}>Rent on the 28th</T>
              <T style={ink}>covered</T>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T variant="bodyStrong" style={ink}>
                Safe to spend
              </T>
              <View style={{ backgroundColor: palette.highlighter, borderRadius: 4, paddingHorizontal: 4 }}>
                <T variant="bodyStrong" money style={ink}>
                  {fmt(shown)}
                </T>
              </View>
            </View>
          </PrintingBud>
        </View>

        <Animated.View entering={rise(0)} style={{ alignItems: 'center', gap: space.xs }}>
          <T variant="title" style={{ alignSelf: 'stretch', textAlign: 'center' }}>
            Your money buddy.
          </T>
          <T tone="textDim" style={{ textAlign: 'center' }}>
            Know what’s safe to spend today. No bank login, ever.
          </T>
        </Animated.View>

        <Animated.View entering={rise(1)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs }}>
          {PROMISES.map((p) => (
            <View key={p} style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }}>
              <T variant="caption">{p}</T>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={rise(2)} style={{ gap: space.xs }}>
        {/* replace, so Welcome never sits behind onboarding or Home. */}
        <Button title="Get started" onPress={() => router.replace('/onboarding')} />
        <View style={{ alignItems: 'center' }}>
          <TextButton title="I’ve used Senbud before" onPress={() => router.push('/welcome-back')} />
        </View>
      </Animated.View>
    </Screen>
  );
}
