// Senbud UI kit: the component layer on top of @senbud/core/tokens. Screens use these, never raw colours.
// Spec: docs/senbud-app-design-system.md.
import type { Category } from '@senbud/core';
import { categoryColors, motion, radius, space, type Theme, themes, touch, type } from '@senbud/core/tokens';
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
    primary: { bg: t.accent, pressed: t.accentPressed, fg: t.onAccent },
    highlight: { bg: t.highlight, pressed: '#d4e64a', fg: t.onHighlight },
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
      <T variant="bodyStrong" style={{ color: v.fg }}>
        {title}
      </T>
    </Pressable>
  );
}

// Text link: same tap area as a button, no box.
export function TextButton({ title, onPress, tone = 'accent' }: { title: string; onPress: () => void; tone?: Tone }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12} style={({ pressed }) => [s.textButton, pressed && { opacity: 0.6 }]}>
      <T variant="bodyStrong" tone={tone}>
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
        style={[s.input, type.body, { backgroundColor: t.surface, color: t.text, borderColor: error ? t.bad : t.line }]}
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

// Budget pace: fill colour carries the status, the label next to it says it in words (never colour alone).
export function Progress({ value, status }: { value: number; status: 'ok' | 'close' | 'over' }) {
  const t = useTheme();
  const fill = { ok: t.goodFill, close: t.warnFill, over: t.badFill }[status];
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, value) * 100) }}
      style={[s.track, { backgroundColor: t.surfaceSunken }]}
    >
      <View style={[s.fill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: fill }]} />
    </View>
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
      <TextButton title="Undo" onPress={onUndo} tone="highlight" />
    </Animated.View>
  );
}

// Theme for the native Stack header so it matches the screen behind it.
export function useHeaderOptions() {
  const t = useTheme();
  return {
    headerStyle: { backgroundColor: t.bg },
    headerTintColor: t.accent,
    headerTitleStyle: { color: t.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: t.bg },
  };
}

const s = StyleSheet.create({
  page: { padding: space.md, gap: space.md, flexGrow: 1 },
  card: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
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
