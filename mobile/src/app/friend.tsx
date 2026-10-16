// One friend (design system 4.5): what they owe, their IOUs, and a ready-made reminder. Senbud never
// sends anything itself: WhatsApp or the share sheet opens with the text, and the person sends it.
import { money, netBalances } from '@senbud/core';
import { radius, space } from '@senbud/core/tokens';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Share, View } from 'react-native';

import { type IouRow, listIous, loadSetup, type Profile, setIousPaid } from '@/db';
import { Avatar, Button, Card, Row, Screen, T, UndoBar, useTheme } from '@/ui';

export default function FriendSheet() {
  const db = useSQLiteContext();
  const t = useTheme();
  const { name = '' } = useLocalSearchParams<{ name: string }>();
  const [ious, setIous] = useState<IouRow[]>([]);
  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });
  const [whatsapp, setWhatsapp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [undo, setUndo] = useState<number[] | null>(null);

  const load = useCallback(async () => {
    setIous((await listIous(db)).filter((i) => i.friend === name));
  }, [db, name]);

  useEffect(() => {
    load();
    loadSetup(db).then((s) => s && setProfile(s.profile));
    // Hidden when WhatsApp isn't installed (needs LSApplicationQueriesSchemes / <queries>, see app.json).
    Linking.canOpenURL('whatsapp://send').then(setWhatsapp, () => setWhatsapp(false));
  }, [db, load]);

  const fmt = (cents: number) => money(cents / 100, profile.currency, profile.locale);
  const open = ious.filter((i) => !i.paid);
  const net = netBalances(ious)[name] ?? 0;
  const owesMe = net > 0;
  const theirs = open.filter((i) => i.direction === 'theyOweMe');
  const message =
    theirs.length === 1
      ? `Hey ${name}! ${theirs[0].note} was ${fmt(theirs[0].cents)}!`
      : `Hey ${name}! Just a reminder: ${fmt(net)} for ${theirs.map((i) => i.note).join(', ')}.`;

  async function markPaid() {
    const ids = open.map((i) => i.id);
    await setIousPaid(db, ids, true);
    setUndo(ids);
    load();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
        <Avatar name={name} size={56} />
        <View style={{ flex: 1 }}>
          <T variant="title">{name}</T>
          <T tone={owesMe ? 'good' : 'textDim'}>
            {net === 0 ? 'All settled' : owesMe ? `Owes you ${fmt(net)}` : `You owe ${fmt(-net)}`}
          </T>
        </View>
      </Row>

      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {open.map((i, n) => (
          <Row key={i.id} style={{ minHeight: 48, borderTopWidth: n ? 1 : 0, borderColor: t.line }}>
            <T style={{ flexShrink: 1 }}>{i.note}</T>
            <T variant="bodyStrong" money tone={i.direction === 'theyOweMe' ? 'text' : 'textDim'}>
              {i.direction === 'theyOweMe' ? '' : '−'}
              {fmt(i.cents)}
            </T>
          </Row>
        ))}
        {!open.length && (
          <T tone="textDim" style={{ paddingVertical: space.sm }}>
            Nothing open with {name}.
          </T>
        )}
      </Card>

      {owesMe && (
        <>
          <View style={{ backgroundColor: t.surfaceSunken, borderRadius: radius.sm, padding: space.md }}>
            <T>{message}</T>
          </View>
          {whatsapp && (
            <Button title="Send on WhatsApp" onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`)} />
          )}
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Button title="Other apps" variant="secondary" onPress={() => Share.share({ message })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={copied ? 'Copied' : 'Copy'}
                variant="secondary"
                onPress={async () => {
                  await Clipboard.setStringAsync(message);
                  setCopied(true);
                }}
              />
            </View>
          </Row>
          <T variant="caption" tone="textDim">
            {whatsapp ? 'Opens WhatsApp with this message ready. You pick the chat and tap send.' : 'Opens your share sheet with this message ready.'}
          </T>
        </>
      )}

      {open.length > 0 && <Button title="Mark paid" variant="secondary" onPress={markPaid} />}
      {undo && (
        <UndoBar
          message={`Marked ${name} as paid`}
          onUndo={async () => {
            await setIousPaid(db, undo, false);
            setUndo(null);
            load();
          }}
        />
      )}
    </Screen>
  );
}
