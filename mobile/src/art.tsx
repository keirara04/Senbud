// Senbud's drawings (react-native-svg), ported from docs/concepts/senbud-app-screens.html.
// Bud is the assistant: a receipt with a face. Same drawing in both themes, always decorative.
import { palette } from '@senbud/core/tokens';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

const INK = palette.ink;

export type BudFace = 'happy' | 'thinking' | 'oops' | 'yay';

const FACES: Record<BudFace, () => React.JSX.Element> = {
  happy: () => (
    <>
      <Ellipse cx={25} cy={32} rx={3} ry={3.6} fill={INK} />
      <Ellipse cx={39} cy={32} rx={3} ry={3.6} fill={INK} />
      <Circle cx={26} cy={30.6} r={1} fill="#fff" />
      <Circle cx={40} cy={30.6} r={1} fill="#fff" />
      <Path d="M28.5 38.5q3.5 3.5 7 0" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  thinking: () => (
    <>
      <Ellipse cx={24} cy={30} rx={3} ry={3.6} fill={INK} />
      <Ellipse cx={38} cy={30} rx={3} ry={3.6} fill={INK} />
      <Circle cx={24.6} cy={28.5} r={1} fill="#fff" />
      <Circle cx={38.6} cy={28.5} r={1} fill="#fff" />
      <Path d="M29 40h6" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={44} cy={44} r={1.6} fill={INK} fillOpacity={0.5} />
      <Circle cx={48} cy={44} r={1.6} fill={INK} fillOpacity={0.5} />
      <Circle cx={52} cy={44} r={1.6} fill={INK} fillOpacity={0.5} />
    </>
  ),
  oops: () => (
    <>
      <Path d="M21.5 32.5q3.5 2.5 7 0M35.5 32.5q3.5 2.5 7 0" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M28 40.5q1.33-1.6 2.66 0t2.66 0t2.66 0" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  yay: () => (
    <>
      <Path d="M21.5 33q3.5-4.5 7 0M35.5 33q3.5-4.5 7 0" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M27 36.5h10q0 6.5-5 6.5t-5-6.5z" fill={INK} />
    </>
  ),
};

export function Bud({ face = 'happy', size = 38 }: { face?: BudFace; size?: number }) {
  const Face = FACES[face];
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path
          d="M14 6h36a5 5 0 0 1 5 5v41l-5.75 5-5.75-5-5.75 5-5.75-5-5.75 5-5.75-5-5.75 5-5.75-5V11a5 5 0 0 1 5-5z"
          fill="#fff"
          stroke={INK}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Path d="M18 15h20M18 20h13" stroke={INK} strokeOpacity={0.22} strokeWidth={2.5} strokeLinecap="round" />
        <Ellipse cx={19.5} cy={39} rx={3.6} ry={2.2} fill={palette.coral} fillOpacity={0.45} />
        <Ellipse cx={44.5} cy={39} rx={3.6} ry={2.2} fill={palette.coral} fillOpacity={0.45} />
        <Face />
      </Svg>
    </View>
  );
}

// The treat jar on the cobalt panel. Fill rises from the bottom (y 146) to the dashed goal line
// (y 58) at 100%, and may overflow up to 110%. Coins show only below the money line.
const JAR = 'M36 24h48v8c14 5 20 14 20 28v72c0 8-6 14-14 14H30c-8 0-14-6-14-14V60c0-14 6-23 20-28z';
const COINS = [
  [40, 134], [60, 138], [80, 132], [52, 124], [72, 122], [44, 112], [64, 108], [84, 112],
  [56, 96], [76, 94], [46, 82], [66, 78], [86, 84], [58, 66],
] as const;

export function TreatJar({ share, width = 112 }: { share: number; width?: number }) {
  const top = 146 - 88 * Math.min(1.1, Math.max(0, share));
  const wave = `M0 ${top}q12.5-5 25 0t25 0t25 0t25 0t25 0V150H0z`;
  return (
    <View aria-hidden>
      <Svg width={width} height={(width * 150) / 120} viewBox="0 0 120 150">
        <Defs>
          <ClipPath id="jar">
            <Path d={JAR} />
          </ClipPath>
        </Defs>
        <Path d={JAR} fill="#fff" fillOpacity={0.1} />
        {share > 0 && (
          <G clipPath="url(#jar)">
            <Path d={wave} fill={palette.highlighter} />
            {COINS.filter(([, cy]) => cy - 6 > top).map(([cx, cy]) => (
              <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill="none" stroke="#c9d84a" strokeWidth={2} />
            ))}
          </G>
        )}
        <Path d="M20 58h80" stroke={palette.onCobaltDim} strokeWidth={1.5} strokeDasharray="4 4" />
        {[124, 102, 80].map((y) => (
          <Path key={y} d={`M94 ${y}h8`} stroke={palette.onCobalt} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
        ))}
        <Path d={JAR} fill="none" stroke={palette.onCobalt} strokeWidth={3} strokeLinejoin="round" />
        <Rect x={30} y={8} width={60} height={16} rx={5} fill={palette.onCobalt} />
        <Path d="M38 16h44" stroke={palette.cobalt} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// A thermal receipt: white in both themes, with zig-zag torn edges top and bottom (the web's .receipt).
const TOOTH = 10;

// One edge of teeth: tips point up (top edge) or down (bottom edge); the straight side joins the body.
function Teeth({ width, up }: { width: number; up: boolean }) {
  const h = TOOTH / 2;
  const [tip, base] = up ? [0, h] : [h, 0];
  const pts = [`0,${base}`];
  for (let x = 0; x < width; x += TOOTH) pts.push(`${x + h},${tip}`, `${x + TOOTH},${base}`);
  return (
    <Svg width={width} height={h}>
      <Polygon points={pts.join(' ')} fill="#fff" />
    </Svg>
  );
}

export function ReceiptCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return (
    <View onLayout={onLayout} style={style}>
      {width > 0 && <Teeth width={width} up />}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>{children}</View>
      {width > 0 && <Teeth width={width} up={false} />}
    </View>
  );
}

// Bud as a thermal printer (onboarding, design system 4.1b/4.1c): the receipt feeds out from under Bud
// in three pushes with short pauses (1.3 s) while Bud buzzes, then swings to a slight tilt. Once.
// Under Reduce Motion everything is already in place. `onPrinted` fires when the paper stops.
const PUSHES = [
  [0.33, 364],
  [0.7, 338],
  [1, 234],
] as const;
const PAUSE = 104;
export const PRINT_MS = 1300;

export function PrintingBud({ face = 'happy', budSize = 96, width = 240, children, onPrinted }: { face?: BudFace; budSize?: number; width?: number; children: React.ReactNode; onPrinted?: () => void }) {
  const reduce = useReducedMotion();
  const [h, setH] = useState(0);
  const feed = useSharedValue(reduce ? 1 : 0); // 0 = inside Bud, 1 = fully out
  const tilt = useSharedValue(reduce ? -2 : 0);
  const buzz = useSharedValue(0);

  useEffect(() => {
    if (!h) return;
    if (reduce) return onPrinted?.();
    feed.value = withSequence(...PUSHES.map(([to, ms], i) => (i ? withDelay(PAUSE, withTiming(to, { duration: ms })) : withTiming(to, { duration: ms }))));
    buzz.value = withSequence(withRepeat(withSequence(withTiming(1.5, { duration: 45 }), withTiming(-1.5, { duration: 45 })), 12, true), withTiming(0, { duration: 60 }));
    tilt.value = withDelay(PRINT_MS - 150, withSpring(-2, { damping: 7, stiffness: 120 }));
    const done = setTimeout(() => onPrinted?.(), PRINT_MS);
    return () => clearTimeout(done);
    // Once per mount: the sequence starts when the receipt has been measured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, reduce]);

  const paper = useAnimatedStyle(() => ({ transform: [{ translateY: -h * (1 - feed.value) }, { rotate: `${tilt.value}deg` }] }));
  const bud = useAnimatedStyle(() => ({ transform: [{ translateX: buzz.value }] }));
  const slot = budSize * 0.3; // the clip's top edge sits behind Bud's lower third, like a printer slot

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View entering={reduce ? undefined : ZoomIn.springify().duration(450)} style={[{ zIndex: 2 }, bud]}>
        <Bud face={face} size={budSize} />
      </Animated.View>
      {/* The paper rests a little under Bud's torn bottom edge, so it reads as coming out of Bud. */}
      <View style={{ marginTop: -slot, paddingTop: slot * 0.35, paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden', width: width + 32 }}>
        <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[{ width, opacity: h ? 1 : 0, shadowColor: INK, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, paper]}>
          <ReceiptCard>{children}</ReceiptCard>
        </Animated.View>
      </View>
    </View>
  );
}

// A number that counts up from 0 once `start` turns true (800 ms, ease-out); final value at once under Reduce Motion.
export function useCountUp(target: number, start: boolean) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!start || reduce) return setValue(start || reduce ? target : 0);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 800);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, start, reduce]);
  return value;
}
