import { Bud } from '@/art';
import { Screen, T } from '@/ui';

export default function Assistant() {
  return (
    <Screen>
      <Bud size={96} />
      <T variant="title">What’s up?</T>
    </Screen>
  );
}
