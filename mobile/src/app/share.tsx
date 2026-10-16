// Wrapped share image (design system 4.7): a 9:16 receipt on cobalt, percentages and fun facts only
// unless "Show amounts" is on. Pro stats appear only for Pro. Captured with view-shot, then the
// native share sheet.
import { palette, space } from '@senbud/core/tokens';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ReceiptCard } from '@/art';
import { useWrapped } from '@/money';
import { AiSwitch, Button, Card, Marker, MONO, Screen, T } from '@/ui';

const W = 270;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
      <Mono>{label}</Mono>
      <Mono style={{ flex: 1, opacity: 0.4 }} numberOfLines={1}>
        {'. '.repeat(40)}
      </Mono>
      <Mono>{value}</Mono>
    </View>
  );
}

function Mono({ children, style, numberOfLines }: { children: React.ReactNode; style?: object; numberOfLines?: number }) {
  return (
    <T variant="caption" money numberOfLines={numberOfLines} maxFontSizeMultiplier={1.2} style={[{ color: palette.ink, fontFamily: MONO, fontSize: 12, lineHeight: 16 }, style]}>
      {children}
    </T>
  );
}

export default function Share() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const r = useWrapped(month);
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const [amounts, setAmounts] = useState(false);
  const [error, setError] = useState('');
  if (!r) return null;
  const { w, name, fmt, pro, hours } = r;
  const top = w.categories[0];
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  async function share() {
    setError('');
    try {
      const uri = await captureRef(shot, { format: 'png', result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your Wrapped' });
    } catch {
      setError('Couldn’t make the image. Try again.');
    }
  }

  return (
    <Screen>
      <View
        ref={shot}
        collapsable={false}
        accessible
        accessibilityLabel={`Share image preview: ${pct(w.used)} of budget used${top ? `, top category ${top.category}` : ''}.`}
        style={{ width: W, aspectRatio: 9 / 16, alignSelf: 'center', backgroundColor: palette.cobalt, padding: space.md, justifyContent: 'center' }}
      >
        <ReceiptCard>
          <View style={{ gap: 9, paddingVertical: space.sm }}>
            <Mono style={{ textAlign: 'center', fontWeight: '700', letterSpacing: 2 }}>SENBUD</Mono>
            <Mono style={{ textAlign: 'center', color: palette.inkDim }}>{`${name.toUpperCase()} RECAP`}</Mono>
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(26, 28, 46, 0.3)' }} />
            <View style={{ alignSelf: 'center', marginVertical: space.xs }}>
              <Marker>
                <T variant="hero" money maxFontSizeMultiplier={1} style={{ color: palette.ink, fontSize: 40, lineHeight: 44, paddingHorizontal: space.xs }}>
                  {pct(w.used)}
                </T>
              </Marker>
            </View>
            <Mono style={{ textAlign: 'center', color: palette.inkDim }}>{amounts ? `${fmt(w.spent + w.bills)} of ${fmt(w.budget)}` : 'of budget used'}</Mono>
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(26, 28, 46, 0.3)' }} />
            {top && <Line label="Top category" value={top.category} />}
            {amounts && <Line label="Kept" value={fmt(w.saved)} />}
            {pro && w.topPlace && <Line label="Top place" value={`${w.topPlace.label} ×${w.topPlace.visits}`} />}
            {pro && <Line label="Treats" value={String(w.treats)} />}
            {pro && hours !== null && <Line label="Hours of work" value={String(hours)} />}
            {pro && <Line label="Best streak" value={`${w.streak} ${w.streak === 1 ? 'day' : 'days'}`} />}
            <Mono style={{ textAlign: 'center', color: palette.inkDim, marginTop: space.md }}>Made with Senbud</Mono>
          </View>
        </ReceiptCard>
      </View>
      <Card style={{ paddingVertical: space.xs }}>
        <AiSwitch label="Show amounts" value={amounts} onChange={setAmounts} />
      </Card>
      <Button title="Share image" onPress={share} />
      {error ? (
        <T variant="caption" tone="bad">
          {error}
        </T>
      ) : null}
    </Screen>
  );
}
