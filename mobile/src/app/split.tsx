// Split a bill in three steps (design system 4.5): 1 who and how, 2 who had what (by item, Pro),
// 3 check and save. Your share becomes an expense; everyone else's becomes an IOU. Evenly skips step 2.
import { type Category, iousFromSplit, money, splitBill, splitByItems } from '@senbud/core';
import { palette, radius, space, touch } from '@senbud/core/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ReceiptCard } from '@/art';
import { addIous, addTransactions, listIous, loadSetup, type Profile, today } from '@/db';
import { usePro } from '@/purchases';
import { Button, Card, Field, Icon, ProLock, Row, Screen, T, TextButton, useTheme } from '@/ui';

const ME = 'You';
type Item = { label: string; cents: number; category: Category };
const toCents = (s: string) => Math.round(Number(s.trim().replace(',', '.')) * 100);

export default function Split() {
  const db = useSQLiteContext();
  const t = useTheme();
  const pro = usePro();
  const params = useLocalSearchParams<{ items?: string; merchant?: string }>();
  const items: Item[] = useMemo(() => (params.items ? JSON.parse(params.items) : []), [params.items]);
  const hasItems = items.length > 0;

  const [profile, setProfile] = useState<Profile>({ currency: 'USD', locale: 'en-US' });
  const [known, setKnown] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(params.merchant ?? '');
  const [people, setPeople] = useState<string[]>([ME]);
  const [newName, setNewName] = useState('');
  const [payer, setPayer] = useState(ME);
  const [mode, setMode] = useState<'even' | 'items'>('even');
  const [claims, setClaims] = useState<string[][]>(() => items.map(() => []));
  const [who, setWho] = useState(ME);

  useEffect(() => {
    loadSetup(db).then((s) => s && setProfile(s.profile));
    listIous(db).then((ious) => setKnown([...new Set(ious.map((i) => i.friend))]));
  }, [db]);

  const fmt = (cents: number) => money(cents / 100, profile.currency, profile.locale);
  const total = hasItems ? items.reduce((s, i) => s + i.cents, 0) : toCents(amount) || 0;
  const byItem = mode === 'items' && hasItems;
  const shares: Record<string, number> = byItem
    ? splitByItems(items.map((it, i) => ({ cents: it.cents, owners: claims[i] })), people, payer)
    : splitBill([{ label: note, cents: total, owner: 'Shared' as const }], 'even', people, payer);
  const unassigned = items.map((it, i) => ({ it, i })).filter(({ i }) => !claims[i]?.length);

  function addPerson(name: string) {
    const n = name.trim();
    if (!n || people.some((p) => p.toLowerCase() === n.toLowerCase())) return;
    setPeople([...people, n]);
    setNewName('');
  }
  function removePerson(name: string) {
    setPeople(people.filter((p) => p !== name));
    setClaims(claims.map((c) => c.filter((p) => p !== name)));
    if (payer === name) setPayer(ME);
    if (who === name) setWho(ME);
  }
  function toggleClaim(i: number) {
    setClaims(claims.map((c, n) => (n !== i ? c : c.includes(who) ? c.filter((p) => p !== who) : [...c, who])));
  }

  async function save() {
    const day = today();
    const label = note.trim() || 'Split bill';
    const { myShare, ious } = iousFromSplit(shares, payer, ME, label, day);
    // Your share is what you spent. Its category follows the receipt's biggest item, else Food.
    const category = hasItems ? [...items].sort((a, b) => b.cents - a.cents)[0].category : 'Food';
    if (myShare > 0) await addTransactions(db, [{ date: day, cents: myShare, label, category, source: hasItems ? 'photo' : 'manual' }]);
    if (ious.length) await addIous(db, ious);
    router.dismissTo('/friends');
  }

  if (step === 1) {
    const suggestions = known.filter((k) => !people.includes(k)).slice(0, 6);
    const canNext = people.length >= 2 && total > 0;
    return (
      <Screen>
        <T variant="label" tone="textDim">
          Step 1 of {byItem ? 3 : 2} · Who and how
        </T>
        {hasItems ? (
          <Card>
            <T variant="bodyStrong">
              {params.merchant ?? 'Receipt'} · {fmt(total)}
            </T>
            <T variant="caption" tone="textDim">
              {items.length} items from your photo
            </T>
          </Card>
        ) : (
          <>
            <Field label="How much was the bill?" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="45" autoFocus />
            <Field label="What was it?" value={note} onChangeText={setNote} placeholder="Dinner at Ali Maju" />
          </>
        )}

        <T variant="label" tone="textDim">
          Who was there?
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {people.map((p) => (
            <Chip key={p} label={p} on onPress={p === ME ? undefined : () => removePerson(p)} removable={p !== ME} />
          ))}
          {suggestions.map((k) => (
            <Chip key={k} label={`+ ${k}`} on={false} onPress={() => addPerson(k)} />
          ))}
        </View>
        <Row style={{ flexWrap: 'nowrap' }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={(e) => addPerson(e.nativeEvent.text)}
            placeholder="Add a name"
            placeholderTextColor={t.textDim}
            returnKeyType="done"
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="words"
            blurOnSubmit={false}
            accessibilityLabel="Add a name"
            style={{ flex: 1, minHeight: touch.min, fontSize: 17, color: t.text, backgroundColor: t.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: t.line, paddingHorizontal: space.sm + space.xs }}
          />
          <TextButton title="Add" onPress={() => addPerson(newName)} />
        </Row>

        {people.length > 1 && (
          <>
            <T variant="label" tone="textDim">
              Who paid?
            </T>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {people.map((p) => (
                <Chip key={p} label={p} on={payer === p} radio onPress={() => setPayer(p)} />
              ))}
            </View>
          </>
        )}

        <T variant="label" tone="textDim">
          How to split it?
        </T>
        <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
          <ModeCard
            title="By item"
            sub={hasItems ? 'Each person pays for what they had.' : 'Needs a receipt photo. Snap one to split by item.'}
            on={byItem}
            disabled={!hasItems || !pro}
            lock={!pro}
            onPress={() => setMode('items')}
          />
          <ModeCard
            title="Evenly"
            sub={people.length > 1 && total > 0 ? `About ${fmt(Math.round(total / people.length))} each` : 'Everyone pays the same.'}
            on={!byItem}
            onPress={() => setMode('even')}
          />
        </View>

        <Button title={people.length < 2 ? 'Add who was there' : 'Next'} disabled={!canNext} onPress={() => setStep(byItem ? 2 : 3)} />
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen>
        <T variant="label" tone="textDim">
          Step 2 of 3 · Who had what
        </T>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.xs }}>
          {people.map((p) => {
            const on = p === who;
            return (
              <Pressable
                key={p}
                onPress={() => setWho(p)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${p}, ${fmt(shares[p] ?? 0)} so far`}
                style={{ flex: 1, minHeight: 52, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.primary : t.surface, borderWidth: 1, borderColor: on ? t.primary : t.line }}
              >
                <T variant="bodyStrong" style={{ color: on ? t.onPrimary : t.text }} numberOfLines={1}>
                  {p}
                </T>
                <T variant="caption" money style={{ color: on ? t.onPrimary : t.textDim }}>
                  {fmt(shares[p] ?? 0)}
                </T>
              </Pressable>
            );
          })}
        </View>
        <T variant="caption" tone="textDim">
          Tap what {who === ME ? 'you' : who} had. Shared items split evenly.
        </T>
        <ReceiptCard>
          {items.map((it, i) => {
            const mine = claims[i].includes(who);
            const none = !claims[i].length;
            return (
              <Pressable
                key={i}
                onPress={() => toggleClaim(i)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: mine }}
                accessibilityLabel={`${who} had ${it.label}`}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderLeftWidth: none ? 4 : 0, borderColor: palette.amber, paddingLeft: none ? space.sm : 0 }}
              >
                <View style={{ flex: 1 }}>
                  <T style={{ color: palette.ink }}>{it.label}</T>
                  <T variant="caption" style={{ color: none ? palette.amberInk : palette.inkDim }}>
                    {none ? 'Not assigned' : claims[i].map((p) => p.slice(0, 2).toUpperCase()).join(' · ')}
                  </T>
                </View>
                <T money style={{ color: palette.ink }}>
                  {fmt(it.cents)}
                </T>
                <View style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 2, borderColor: mine ? palette.cobalt : palette.inkDim, backgroundColor: mine ? palette.cobalt : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {mine && <Icon name={{ ios: 'checkmark', android: 'check' }} size={16} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </ReceiptCard>
        {unassigned.length > 0 && (
          <T variant="caption" tone="warn">
            {unassigned.length} {unassigned.length === 1 ? 'item' : 'items'} left: {unassigned.map(({ it }) => it.label).join(', ')}
          </T>
        )}
        <Button title="Next" disabled={unassigned.length > 0} onPress={() => setStep(3)} />
        <TextButton title="Back" onPress={() => setStep(1)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <T variant="label" tone="textDim">
        Step {byItem ? 3 : 2} of {byItem ? 3 : 2} · Check and save
      </T>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {people.map((p, i) => (
          <Row key={p} style={{ minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
            <T variant="bodyStrong">{p}</T>
            <View style={{ alignItems: 'flex-end' }}>
              <T variant="bodyStrong" money>
                {fmt(shares[p] ?? 0)}
              </T>
              <T variant="caption" tone={p === ME ? 'textDim' : payer === ME ? 'good' : 'textDim'}>
                {p === ME ? 'your share' : payer === ME ? 'owes you' : p === payer ? 'paid' : ''}
              </T>
            </View>
          </Row>
        ))}
        <Row style={{ minHeight: 48, borderTopWidth: 1, borderColor: t.line }}>
          <T tone="textDim">Total, paid by {payer === ME ? 'you' : payer}</T>
          <T variant="bodyStrong" money>
            {fmt(total)}
          </T>
        </Row>
      </Card>
      {payer !== ME && (
        <T variant="caption" tone="textDim">
          You’ll owe {payer} {fmt(shares[ME] ?? 0)}.
        </T>
      )}
      <Button title="Save split" onPress={save} />
      <TextButton title="Back" onPress={() => setStep(byItem ? 2 : 1)} />
    </Screen>
  );
}

function Chip({ label, on, onPress, removable, radio }: { label: string; on: boolean; onPress?: () => void; removable?: boolean; radio?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { selected: on } : undefined}
      accessibilityLabel={removable ? `Remove ${label}` : label}
      style={{ minHeight: touch.min, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: on ? t.primary : t.surface, borderWidth: 1, borderColor: on ? t.primary : t.line }}
    >
      <T variant="bodyStrong" style={{ color: on ? t.onPrimary : t.text }}>
        {label}
      </T>
      {removable && <Icon name={{ ios: 'xmark', android: 'close' }} size={14} color={on ? t.onPrimary : t.textDim} />}
    </Pressable>
  );
}

function ModeCard({ title, sub, on, onPress, disabled, lock }: { title: string; sub: string; on: boolean; onPress: () => void; disabled?: boolean; lock?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={lock ? () => router.push('/pro') : onPress}
      disabled={disabled && !lock}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled: disabled && !lock }}
      style={{ borderRadius: radius.md, borderWidth: 2, borderColor: on ? t.accent : t.line, backgroundColor: t.surface, padding: space.md, gap: space.xxs, opacity: disabled && !lock ? 0.5 : 1 }}
    >
      <Row style={{ justifyContent: 'flex-start' }}>
        <T variant="bodyStrong">{title}</T>
        {lock && <ProLock onPress={() => router.push('/pro')} />}
      </Row>
      <T variant="caption" tone="textDim">
        {sub}
      </T>
    </Pressable>
  );
}
