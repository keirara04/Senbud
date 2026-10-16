// Friends (design system 4.5): who owes whom, net. The hero is highlighter both ways; the label says
// the direction, so owing money never reads as a telling-off.
import { daysBetween, netBalances } from '@senbud/core';
import { space } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { type IouRow, listIous } from '@/db';
import { useMoney } from '@/money';
import { Avatar, Button, Card, Row, Screen, T, TextButton, useTheme } from '@/ui';

export default function Friends() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { money: m } = useMoney();
  const [ious, setIous] = useState<IouRow[]>([]);
  useFocusEffect(
    useCallback(() => {
      listIous(db).then(setIous);
    }, [db]),
  );
  if (!m) return null;
  const { fmt, day, setup } = m;

  const net = netBalances(ious);
  const friends = Object.entries(net).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const total = friends.reduce((s, [, c]) => s + c, 0);
  const iOwe = friends.filter(([, c]) => c < 0);
  const monthStart = day.slice(0, 8) + '01';
  const settled = new Set(ious.filter((i) => i.paid && i.date >= monthStart).map((i) => i.friend)).size;
  const label = total > 0 ? 'Owed to you' : total < 0 ? 'You owe overall' : 'All settled';
  const caption = friends.length
    ? `across ${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}${total > 0 && iOwe.length ? `, after the ${fmt(-iOwe[0][1])} you owe ${iOwe[0][0]}` : ''}.`
    : 'Nobody owes anybody.';
  const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(setup.profile.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <Screen>
      <Card tone="panel">
        <T variant="label" tone="onPanelDim">
          {label}
        </T>
        <T variant="hero" tone="highlight" money accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
          {fmt(Math.abs(total))}
        </T>
        <T variant="caption" tone="onPanelDim">
          {caption}
        </T>
      </Card>

      {friends.length ? (
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {friends.map(([name, cents], i) => {
            const theirs = ious.filter((x) => x.friend === name && !x.paid);
            const latest = theirs[0];
            const oldest = theirs[theirs.length - 1];
            const stale = cents > 0 && oldest && daysBetween(oldest.date, day) > 7;
            return (
              <Pressable
                key={name}
                onPress={() => router.push({ pathname: '/friend', params: { name } })}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${cents > 0 ? `owes you ${fmt(cents)}` : `you owe ${fmt(-cents)}`}`}
                style={({ pressed }) => ({ paddingVertical: space.sm, borderTopWidth: i ? 1 : 0, borderColor: t.line, opacity: pressed ? 0.6 : 1 })}
              >
                <Row style={{ flexWrap: 'nowrap' }}>
                  <Avatar name={name} />
                  <View style={{ flex: 1, gap: space.xxs }}>
                    <T variant="bodyStrong">{name}</T>
                    <T variant="caption" tone="textDim" numberOfLines={1}>
                      {latest ? `${latest.note} · ${dateLabel(latest.date)}` : ''}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T variant="bodyStrong" money>
                      {fmt(Math.abs(cents))}
                    </T>
                    <T variant="caption" tone={cents > 0 ? 'good' : 'textDim'}>
                      {cents > 0 ? 'owes you' : 'you owe'}
                    </T>
                  </View>
                </Row>
                {stale && (
                  <Row style={{ justifyContent: 'flex-start', paddingLeft: 48 }}>
                    <T variant="caption" tone="textDim">
                      {daysBetween(oldest.date, day)} days ago
                    </T>
                    <TextButton title="Remind" onPress={() => router.push({ pathname: '/friend', params: { name } })} />
                  </Row>
                )}
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <View style={{ gap: space.xs }}>
          <T>Paid for the group? Split it here, or tap Split on a scanned receipt.</T>
          <T variant="caption" tone="textDim">
            Friends are just names. Senbud doesn’t read your contacts.
          </T>
        </View>
      )}

      <Button title="Split a bill" onPress={() => router.push('/split')} />
      {settled > 0 && (
        <T variant="caption" tone="textDim" style={{ textAlign: 'center' }}>
          {settled} settled this month
        </T>
      )}
    </Screen>
  );
}
