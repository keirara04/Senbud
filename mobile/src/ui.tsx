// Senbud UI kit: the component layer on top of @senbud/core/tokens. Screens use these, never raw colours.
// Spec: docs/senbud-app-design-system.md.
import type { Category } from '@senbud/core';
import { categoryColors, motion, palette, radius, space, type Theme, themes, touch, type } from '@senbud/core/tokens';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Bud } from '@/art';
import { DarkTheme, DefaultTheme } from 'expo-router';

export const useTheme = (): Theme => themes[useColorScheme() === 'dark' ? 'dark' : 'light'];

type Tone = 'text' | 'textDim' | 'accent' | 'good' | 'warn' | 'bad' | 'onPanel' | 'onPanelDim' | 'highlight';

export function T({
  variant = 'body',
  tone = 'text',
  money,
  style,
  children,
  ...rest
}: {
  variant?: keyof typeof type;
  tone?: Tone;
  money?: boolean; // tabular figures so amounts line up and don't jitter as they change
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Omit<TextProps, 'style'>) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: t[tone] },
        variant === 'label' && { textTransform: 'uppercase' },
        money && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// A whole screen: notebook background, standard gutter, scrolls by default.
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  if (!scroll) return <View style={[s.page, { flex: 1, backgroundColor: t.bg }]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={s.page}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

// "panel" is the cobalt hero card (one per screen at most); "surface" is everything else.
export function Card({ tone = 'surface', style, children }: { tone?: 'surface' | 'panel'; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: tone === 'panel' ? t.panel : t.surface }, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.row, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'highlight' | 'secondary' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const t = useTheme();
  const look: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
    primary: { bg: t.primary, pressed: t.primaryPressed, fg: t.onPrimary },
    highlight: { bg: t.highlight, pressed: palette.highlighterPressed, fg: t.onHighlight },
    secondary: { bg: 'transparent', pressed: t.surfaceSunken, fg: t.accent, border: t.line },
    danger: { bg: 'transparent', pressed: t.surfaceSunken, fg: t.bad, border: t.line },
  };
  const v = look[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      android_ripple={{ color: t.line }}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border ?? 'transparent', opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <T variant="bodyStrong" style={{ color: v.fg, textAlign: 'center' }}>
        {title}
      </T>
    </Pressable>
  );
}

// Text link: same tap area as a button, no box.
export function TextButton({ title, onPress, tone = 'accent', color }: { title: string; onPress: () => void; tone?: Tone; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12} style={({ pressed }) => [s.textButton, pressed && { opacity: 0.6 }]}>
      <T variant="bodyStrong" tone={tone} style={color ? { color } : undefined}>
        {title}
      </T>
    </Pressable>
  );
}

export function Field({ label, error, ...input }: { label: string; error?: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <T variant="label" tone="textDim">
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.textDim}
        selectionColor={t.accent}
        {...input}
        // No lineHeight on inputs: a fixed one clips the text at large accessibility sizes.
        style={[s.input, { fontSize: type.body.fontSize, backgroundColor: t.surface, color: t.text, borderColor: error ? t.bad : t.line }]}
      />
      {error ? (
        <T variant="caption" tone="bad">
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[s.segmented, { backgroundColor: t.surfaceSunken }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[s.segment, on && { backgroundColor: t.surface }]}
          >
            <T variant="bodyStrong" tone={on ? 'text' : 'textDim'}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CategoryChip({ category }: { category: Category }) {
  const c = categoryColors[category];
  return (
    <View style={[s.chip, { backgroundColor: c.bg }]}>
      <T variant="caption" style={{ color: c.fg, fontWeight: '600' }}>
        {category}
      </T>
    </View>
  );
}

export const CATEGORIES: Category[] = ['Food', 'Transport', 'Treat', 'Groceries', 'Subscription', 'Other'];

// Category chips as a radio group; the selected chip gets a 2 pt ring in text colour (spec 4.1).
export function CategoryPicker({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {CATEGORIES.map((c) => {
        const on = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              minHeight: touch.min - 8,
              justifyContent: 'center',
              paddingHorizontal: space.md,
              borderRadius: radius.pill,
              backgroundColor: categoryColors[c].bg,
              borderWidth: 2,
              borderColor: on ? t.text : 'transparent',
            }}
          >
            <T variant="bodyStrong" style={{ color: categoryColors[c].fg }}>
              {c}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// Budget pace: fill colour carries the status, the label next to it says it in words (never colour alone).
// tone="panel" sits on cobalt: a white 22% track, and coralLight for over (plain coral is 2.7:1 there).
export function Progress({ value, status, tone }: { value: number; status: 'ok' | 'close' | 'over'; tone?: 'panel' }) {
  const t = useTheme();
  const onPanel = tone === 'panel';
  const fill = { ok: t.goodFill, close: t.warnFill, over: onPanel ? palette.coralLight : t.badFill }[status];
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, value) * 100) }}
      style={[s.track, { backgroundColor: onPanel ? 'rgba(255, 255, 255, 0.22)' : t.surfaceSunken }]}
    >
      <View style={[s.fill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: fill }]} />
    </View>
  );
}

// A locked Pro option: grey chip with a lock. Opens the paywall; never hides the option it marks.
export function ProLock({ onPress }: { onPress: () => void }) {
  const c = categoryColors.Other;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Senbud Pro, see plans" hitSlop={12}>
      <View style={[s.chip, { backgroundColor: c.bg, flexDirection: 'row', alignItems: 'center', gap: space.xxs }]}>
        <Icon name={{ ios: 'lock.fill', android: 'lock' }} size={12} color={c.fg} />
        <T variant="caption" style={{ color: c.fg, fontWeight: '600' }}>
          Pro
        </T>
      </View>
    </Pressable>
  );
}

// System icons, never emoji: SF Symbols on iOS, Material Symbols on Android. Decorative unless given a label.
export type IconName = { ios: Extract<SymbolViewProps['name'], string>; android: Exclude<SymbolViewProps['name'], string>['android'] };

export function Icon({ name, size = 24, color, label }: { name: IconName; size?: number; color?: string; label?: string }) {
  const t = useTheme();
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color ?? t.text}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}

// Centre of the tab bar: Bud on a raised cobalt circle (56 pt). Opens the assistant; never switches tabs.
// In dark mode a periwinkle ring keeps the circle visible (cobalt on night is 2.4:1).
export function BudTab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask Bud"
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          // Raised 12 pt, not the spec's 22: touches above the tab bar's own bounds never reach the button.
          marginTop: -12,
          borderRadius: 28,
          backgroundColor: t.panel,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: dark ? 1.5 : 0,
          borderColor: t.onPanelDim,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <Bud size={38} />
      </View>
      <T variant="label" tone="textDim" style={{ fontSize: 11, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
        Bud
      </T>
    </Pressable>
  );
}

// Highlighter stroke behind a word, the web's .marker. Use once per screen, on the phrase that matters.
export function Marker({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <View style={[s.marker, { backgroundColor: t.highlight }]} />
      {children}
    </View>
  );
}

// Snackbar for reversible actions. Slides in; the OS reduce-motion setting turns it into a plain appear.
export function UndoBar({ message, onUndo }: { message: string; onUndo: () => void }) {
  const t = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.base)}
      exiting={FadeOut.duration(motion.fast)}
      accessibilityLiveRegion="polite"
      style={[s.undo, { backgroundColor: t.text }]}
    >
      <T variant="body" style={{ color: t.bg, flex: 1 }}>
        {message}
      </T>
      {/* The bar is ink in light mode and moon in dark: highlighter reads on ink (15:1) but not on
          moon (1.0:1), so dark mode uses cobalt (6.7:1). */}
      <TextButton title="Undo" onPress={onUndo} color={useColorScheme() === 'dark' ? palette.cobalt : t.highlight} />
    </Animated.View>
  );
}

// React Navigation theme built from ours, so headers, back buttons and screen backgrounds follow the
// system scheme live (static headerStyle options don't update when the scheme flips).
export function useNavigationTheme() {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: t.accent, background: t.bg, card: t.bg, text: t.text, border: t.line, notification: t.badFill },
  };
}

const s = StyleSheet.create({
  page: { padding: space.md, gap: space.md, flexGrow: 1 },
  card: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  // Wraps so large accessibility text pushes items onto a new line instead of off screen.
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  button: { minHeight: touch.min, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space.md, alignItems: 'center', justifyContent: 'center' },
  textButton: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: space.xs },
  input: { minHeight: touch.min, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: space.sm + space.xs },
  segmented: { flexDirection: 'row', borderRadius: radius.sm, padding: space.xs, gap: space.xs },
  segment: { flex: 1, minHeight: touch.min - space.sm, borderRadius: radius.sm - 2, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xxs, alignSelf: 'flex-start' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  marker: { position: 'absolute', left: -2, right: -2, bottom: 2, height: '38%', borderRadius: 3, opacity: 0.85, transform: [{ rotate: '-1deg' }] },
  undo: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm, paddingLeft: space.md, paddingRight: space.sm, gap: space.sm },
});
