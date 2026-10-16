// Senbud UI kit: the component layer on top of @senbud/core/tokens. Screens use these, never raw colours.
// Spec: docs/senbud-app-design-system.md.
import type { Category } from '@senbud/core';
import { categoryColors, motion, palette, radius, space, type Theme, themes, touch, type } from '@senbud/core/tokens';
import { type ReactNode, useState, useSyncExternalStore } from 'react';
import {
  Appearance,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Bud } from '@/art';
import { DarkTheme, DefaultTheme } from 'expo-router';

// Receipt type: the thermal-printer look on ReceiptCards.
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

// RN-web's Appearance follows the browser only (no setColorScheme), so on web the Settings choice is kept
// here and wins over the browser unless it is System.
let webTheme: 'system' | 'light' | 'dark' = 'dark';
const webThemeListeners = new Set<() => void>();
const subscribeWebTheme = (cb: () => void) => (webThemeListeners.add(cb), () => void webThemeListeners.delete(cb));
const useScheme = () => {
  const system = useColorScheme();
  const chosen = useSyncExternalStore(subscribeWebTheme, () => webTheme, () => webTheme);
  return Platform.OS === 'web' && chosen !== 'system' ? chosen : system;
};

export const useTheme = (): Theme => themes[useScheme() === 'dark' ? 'dark' : 'light'];

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

// onPanel: an outline button on the cobalt panel (Wrapped's Share).
type ButtonVariant = 'primary' | 'highlight' | 'secondary' | 'danger' | 'onPanel';

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
    onPanel: { bg: 'transparent', pressed: 'rgba(255, 255, 255, 0.12)', fg: t.onPanel, border: t.onPanelDim },
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

// A friend: initials on a sunken circle. Never a photo, and no contacts access (friends are just names).
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const t = useTheme();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}
    >
      <T variant="bodyStrong" style={{ fontSize: size * 0.4 }}>
        {initials}
      </T>
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

// System icons, never emoji: SF Symbols on iOS, Material Symbols on Android and web. Decorative unless given a label.
export type IconName = { ios: Extract<SymbolViewProps['name'], string>; android: Exclude<SymbolViewProps['name'], string>['android'] };

export function Icon({ name, size = 24, color, label }: { name: IconName; size?: number; color?: string; label?: string }) {
  const t = useTheme();
  return (
    <SymbolView
      name={{ ...name, web: name.android }}
      size={size}
      tintColor={color ?? t.text}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}

// One row of an inset grouped list (Settings): label, optional value, chevron when it goes somewhere.
// `first` drops the divider above it. `right` replaces value and chevron (a Switch, say).
export function ListRow({ label, value, onPress, first, right, tone }: { label: string; value?: string; onPress?: () => void; first?: boolean; right?: ReactNode; tone?: Tone }) {
  const t = useTheme();
  const row: ViewStyle = { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: first ? 0 : 1, borderColor: t.line };
  // A row with its own control stays a plain View: a Pressable around it would swallow the Switch's
  // touches and hide it from VoiceOver as a separate element.
  if (right)
    return (
      <View style={row}>
        <T tone={tone} style={{ flex: 1 }}>
          {label}
        </T>
        {right}
      </View>
    );
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <T tone={tone} style={{ flex: 1 }}>
        {label}
      </T>
      {value ? <T tone="textDim">{value}</T> : null}
      {onPress ? <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={14} color={t.textDim} /> : null}
    </Pressable>
  );
}

// Minor digits of a currency, from Intl (0 for KRW/JPY, 2 for most).
export const digitsOf = (currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

// 3×4 keypad for an amount typed as a string ("12.5"). The decimal key is hidden for zero-decimal
// currencies. Keys are buttons, ⌫ is "Delete", and each press gives a light tick.
export function AmountPad({ value, onChange, digits }: { value: string; onChange: (v: string) => void; digits: number }) {
  const t = useTheme();
  function press(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === 'del') return onChange(value.slice(0, -1));
    if (key === '.' && (value.includes('.') || digits === 0)) return;
    const next = value === '0' && key !== '.' ? key : value + key;
    const [, dec = ''] = next.split('.');
    if (dec.length > digits || next.replace('.', '').length > 7) return;
    onChange(next);
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', digits ? '.' : '', '0', 'del'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {keys.map((k, i) =>
        k ? (
          <Pressable
            key={k}
            onPress={() => press(k)}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
            style={({ pressed }) => ({ flexBasis: '30%', flexGrow: 1, minHeight: touch.min + 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.surfaceSunken : t.surface })}
          >
            {k === 'del' ? <Icon name={{ ios: 'delete.left', android: 'backspace' }} /> : <T variant="title">{k}</T>}
          </Pressable>
        ) : (
          <View key={`blank-${i}`} style={{ flexBasis: '30%', flexGrow: 1 }} />
        ),
      )}
    </View>
  );
}

// A row of 48 pt amount chips (radio). Scrolls sideways at large text instead of shrinking.
export function QuickPicks({ options, value, onChange, label }: { options: { value: number; label: string }[]; value: number | null; onChange: (v: number) => void; label: string }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel={label} contentContainerStyle={{ gap: space.sm }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => ({ minHeight: touch.min, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1.5, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.surfaceSunken : pressed ? t.surfaceSunken : t.surface })}
          >
            <T variant="bodyStrong" tone={on ? 'accent' : 'text'} money>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Days 1–31 as 48 pt circles (radiogroup), scrolled so the chosen day is in view.
export function DayStrip({ value, onChange, ordinal }: { value: number; onChange: (d: number) => void; ordinal: (d: number) => string }) {
  const t = useTheme();
  const size = touch.min;
  const step = size + space.sm;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={`Rent due on the ${ordinal(value)}`}
      contentContainerStyle={{ gap: space.sm }}
      contentOffset={{ x: Math.max(0, (value - 3) * step), y: 0 }}
    >
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
        const on = d === value;
        return (
          <Pressable
            key={d}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onChange(d);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`The ${ordinal(d)}`}
            style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.primary : t.surface, borderWidth: on ? 0 : 1, borderColor: t.line }}
          >
            <T variant="bodyStrong" style={{ color: on ? t.onPrimary : t.text }}>
              {d}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// A big either/or answer (radio), 64 pt or taller.
export function ChoiceCard({ title, hint, selected, onPress }: { title: string; hint?: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hint ? `${title}, ${hint}` : title}
      style={({ pressed }) => ({ flex: 1, minHeight: 64, padding: space.md, gap: space.xxs, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? t.accent : t.line, backgroundColor: pressed ? t.surfaceSunken : t.surface, justifyContent: 'center' })}
    >
      <T variant="bodyStrong" tone={selected ? 'accent' : 'text'}>
        {title}
      </T>
      {hint ? (
        <T variant="caption" tone="textDim">
          {hint}
        </T>
      ) : null}
    </Pressable>
  );
}

// Back, a segmented progress bar and Skip when the step is optional. `step` is 1-based.
export function StepHeader({ step, total, onBack, onSkip }: { step: number; total: number; onBack?: () => void; onSkip?: () => void }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.min }}>
      <View style={{ width: touch.min }}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={{ width: touch.min, height: touch.min, justifyContent: 'center' }}>
            <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} color={t.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: space.xs }} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t.surfaceSunken, overflow: 'hidden' }}>
            <Animated.View layout={reduce ? undefined : LinearTransition.duration(250)} style={{ height: 6, width: i < step ? '100%' : '0%', backgroundColor: t.accent }} />
          </View>
        ))}
      </View>
      <View style={{ width: touch.min + space.md, alignItems: 'flex-end' }}>{onSkip ? <TextButton title="Skip" tone="textDim" onPress={onSkip} /> : null}</View>
    </View>
  );
}

// A titled group of ListRows on one card, with an optional footnote.
export function ListGroup({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label" tone="textDim">
        {title}
      </T>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>{children}</Card>
      {footer ? (
        <T variant="caption" tone="textDim">
          {footer}
        </T>
      ) : null}
    </View>
  );
}

// The one AI switch, in Settings and again under "What gets sent".
// The whole row is the control and the Switch only shows the state: on iOS 26 RN's Switch frame and
// UIKit's drawing disagree, so taps on the drawn switch never reached it. Also one VoiceOver element.
export function AiSwitch({
  value,
  onChange,
  first = true,
  label = 'Use AI for photos and questions',
}: {
  value: boolean;
  onChange: (on: boolean) => void;
  first?: boolean;
  label?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: first ? 0 : 1, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}
    >
      <T style={{ flex: 1 }}>{label}</T>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch value={value} trackColor={{ true: t.primary }} />
      </View>
    </Pressable>
  );
}

// Wrapped's story: full-bleed cobalt pages, one stat each, with segment bars, a label and Close.
// Tap the right or left half to move. No autoplay, and pages cut rather than slide, so Reduce Motion
// needs nothing extra. Each page is one accessibility element read as its sentence.
export function StoryPager({
  title,
  pages,
  onClose,
  footer,
}: {
  title: string;
  pages: { label: string; body: ReactNode }[];
  onClose: () => void;
  footer?: (index: number) => ReactNode;
}) {
  const t = useTheme();
  const [i, setI] = useState(0);
  const page = pages[Math.min(i, pages.length - 1)];
  return (
    <View style={{ flex: 1, gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {pages.map((p, k) => (
          <View key={k} style={{ flex: 1, height: 3, borderRadius: radius.pill, backgroundColor: k <= i ? t.onPanel : 'rgba(255, 255, 255, 0.3)' }} />
        ))}
      </View>
      <Row style={{ flexWrap: 'nowrap' }}>
        <T variant="label" tone="onPanelDim">
          {title}
        </T>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} style={{ padding: space.xs }}>
          <Icon name={{ ios: 'xmark', android: 'close' }} color={t.onPanel} />
        </Pressable>
      </Row>
      <View style={{ flex: 1 }}>
        <View
          accessible
          accessibilityLabel={`${page.label} Card ${i + 1} of ${pages.length}.`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => setI((k) => Math.max(0, Math.min(pages.length - 1, k + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
          accessibilityRole="adjustable"
          style={{ flex: 1, justifyContent: 'center', gap: space.sm }}
        >
          {page.body}
        </View>
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Pressable style={{ flex: 1 }} onPress={() => setI((k) => Math.max(0, k - 1))} />
          <Pressable style={{ flex: 1 }} onPress={() => (i < pages.length - 1 ? setI(i + 1) : onClose())} />
        </View>
      </View>
      {footer?.(i)}
    </View>
  );
}

// Horizontal bars by category, sorted, the % written on every bar. Drawn on a white ReceiptCard, so
// fills are the category inks (7.3–9.9:1 on white). On a dark surface it would need the tints instead.
export function BarChart({ data, font }: { data: { category: Category; share: number }[]; font?: string }) {
  const top = Math.max(...data.map((d) => d.share), 0.0001);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <View accessible accessibilityLabel={data.map((d) => `${d.category} ${pct(d.share)}`).join(', ')} style={{ gap: space.sm }}>
      {data.map((d) => (
        <View key={d.category} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T variant="caption" numberOfLines={1} style={{ width: 108, color: palette.ink, fontFamily: font }}>
            {d.category}
          </T>
          <View style={{ flex: 1 }}>
            <View style={{ width: `${(d.share / top) * 100}%`, minWidth: 4, height: 14, borderRadius: 3, backgroundColor: categoryColors[d.category].fg }} />
          </View>
          <T variant="caption" money style={{ width: 40, textAlign: 'right', color: palette.ink, fontFamily: font }}>
            {pct(d.share)}
          </T>
        </View>
      ))}
    </View>
  );
}

// Light / Dark / System from Settings. 'unspecified' hands the choice back to the OS.
export const applyTheme = (theme: 'system' | 'light' | 'dark') => {
  if (Platform.OS !== 'web') return Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  webTheme = theme;
  webThemeListeners.forEach((l) => l());
};

// Centre of the tab bar: Bud on a raised cobalt circle (56 pt). Opens the assistant; never switches tabs.
// In dark mode a periwinkle ring keeps the circle visible (cobalt on night is 2.4:1).
export function BudTab({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const dark = useScheme() === 'dark';
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
export function Marker({ children, align = 'flex-start' }: { children: ReactNode; align?: 'flex-start' | 'center' }) {
  const t = useTheme();
  return (
    <View style={{ alignSelf: align }}>
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
      <TextButton title="Undo" onPress={onUndo} color={useScheme() === 'dark' ? palette.cobalt : t.highlight} />
    </Animated.View>
  );
}

// React Navigation theme built from ours, so headers, back buttons and screen backgrounds follow the
// system scheme live (static headerStyle options don't update when the scheme flips).
export function useNavigationTheme() {
  const t = useTheme();
  const dark = useScheme() === 'dark';
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
  // alignContent: wrapped rows with a minHeight otherwise sit at the top of it.
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', alignContent: 'center', gap: space.sm },
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
