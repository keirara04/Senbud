// What Bud remembers (Settings → AI, Pro; build plan P3.5): the lines the person kept from Bud's
// "Remember this?" slip, each deletable, and the chats kept on this phone. Up to 5 relevant lines go
// with a question (see What gets sent); nothing here is stored anywhere else.
import { space } from '@senbud/core/tokens';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { clearChats, forgetMemory, loadMemory, type Memory, MEMORY_MAX } from '@/db';
import { usePro } from '@/purchases';
import { Button, Card, Icon, ListGroup, Row, Screen, T, TextButton, useTheme } from '@/ui';

export default function WhatBudRemembers() {
  const db = useSQLiteContext();
  const t = useTheme();
  const pro = usePro();
  const [lines, setLines] = useState<Memory[]>([]);
  const [chatsCleared, setChatsCleared] = useState(false);
  const load = useCallback(() => {
    loadMemory(db).then(setLines);
  }, [db]);
  useFocusEffect(load);

  if (!pro)
    return (
      <Screen>
        <Card>
          <T variant="bodyStrong">Bud remembers with Senbud Pro</T>
          <T tone="textDim">Tell Bud your goals, your payday or how you like answers, and it keeps them for next time. Your chats stay on this phone for 30 days too.</T>
          <Button title="See plans" variant="secondary" onPress={() => router.push('/pro')} />
        </Card>
      </Screen>
    );

  return (
    <Screen>
      <ListGroup title={`Kept lines · ${lines.length} of ${MEMORY_MAX}`} footer="Bud asks before keeping anything. Up to 5 lines that fit your question go with it, and nothing is stored on Senbud’s server.">
        {lines.length ? (
          lines.map((m, i) => (
            <Row key={m.id} style={{ minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: t.line, flexWrap: 'nowrap' }}>
              <T style={{ flex: 1 }}>{m.text}</T>
              <Pressable
                onPress={async () => {
                  await forgetMemory(db, m.id);
                  load();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Forget “${m.text}”`}
                hitSlop={14}
                style={{ padding: space.xs }}
              >
                <Icon name={{ ios: 'trash', android: 'delete' }} size={20} color={t.bad} />
              </Pressable>
            </Row>
          ))
        ) : (
          <View style={{ paddingVertical: space.sm }}>
            <T tone="textDim">Nothing yet. Tell Bud something like “I get paid on the 25th” and it’ll ask to remember it.</T>
          </View>
        )}
      </ListGroup>
      {lines.length > 0 && (
        <Button
          title="Forget everything"
          variant="danger"
          onPress={async () => {
            await forgetMemory(db);
            load();
          }}
        />
      )}
      <TextButton
        title={chatsCleared ? 'Chat history cleared' : 'Clear chat history'}
        tone="textDim"
        onPress={async () => {
          await clearChats(db);
          setChatsCleared(true);
        }}
      />
    </Screen>
  );
}
