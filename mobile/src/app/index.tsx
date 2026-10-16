import { money, parseSpending } from '@senbud/core';
import { colors, radius, space } from '@senbud/core/tokens';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const INPUT = 'lunch 12, uber 8';
const items = parseSpending(INPUT);
const total = items.reduce((sum, i) => sum + i.amount, 0);

// Phase 0 spike: engine probes, diffed against Node in docs/senbud-mobile-audit.md (Hermes findings).
const probe = {
  engine: 'HermesInternal' in globalThis ? 'hermes' : 'other',
  lookbehind: /(?<=a)b/.test('ab'),
  unicodeLetter: /\p{L}/u.test('é'),
  at: [1, 2].at(-1),
  parsed: parseSpending('lunch 12, grab 8 and $4.50 kopi; 1,200 rent, café 3, -5 lunch'),
  money: [12, 4.5, 1200, 11.999999999999998].flatMap((n) =>
    [['USD', 'en-US'], ['MYR', 'ms-MY'], ['MYR', 'en-MY'], ['EUR', 'de-DE']].map(([c, l]) => money(n, c, l)),
  ),
};
console.log('SENBUD_PROBE ' + JSON.stringify(probe));

export default function Home() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.input}>“{INPUT}”</Text>
      <View style={styles.receipt}>
        {items.map((i) => (
          <View key={i.label} style={styles.row}>
            <Text style={styles.label}>
              {i.label} · {i.category}
            </Text>
            <Text style={styles.amount}>{money(i.amount, 'USD', 'en-US')}</Text>
          </View>
        ))}
        <View style={[styles.row, styles.total]}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.amount}>{money(total, 'USD', 'en-US')}</Text>
        </View>
      </View>
      <Text selectable style={styles.probe}>
        {JSON.stringify(probe, null, 1)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, gap: space.md, backgroundColor: colors.light.paper, flexGrow: 1 },
  input: { fontSize: 20, fontWeight: '600', color: colors.light.ink },
  receipt: { backgroundColor: colors.receipt, borderRadius: radius.md, padding: space.md, gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { borderTopWidth: 1, borderColor: colors.light.inkDim, paddingTop: space.sm },
  label: { color: colors.receiptInk, fontSize: 16 },
  amount: { color: colors.receiptInk, fontSize: 16, fontVariant: ['tabular-nums'] },
  probe: { fontFamily: 'Menlo', fontSize: 11, color: colors.light.inkDim },
});
