import { router } from 'expo-router';

import { Button, Screen } from '@/ui';

// ponytail: placeholder until the Settings step; only the existing Budget and rent screen for now.
export default function Settings() {
  return (
    <Screen>
      <Button title="Budget and rent" variant="secondary" onPress={() => router.push('/setup')} />
      <Button title="Senbud Pro" variant="secondary" onPress={() => router.push('/pro')} />
    </Screen>
  );
}
