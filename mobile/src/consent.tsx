// One AI consent for everything that leaves the phone: receipt photos and questions to Bud. The
// "Bud uses AI" sheet (app/ai-consent.tsx) asks once; What gets sent shows the same cards.
import { router } from 'expo-router';

import { Card, T } from '@/ui';

export function AiUses() {
  return (
    <>
      <Card>
        <T variant="bodyStrong">When you snap a receipt</T>
        <T>The photo goes to Senbud’s server and on to an AI model (currently Google Gemini) through OpenRouter, only to read that receipt.</T>
      </Card>
      <Card>
        <T variant="bodyStrong">When you ask Bud a question</T>
        <T>Your question, your last few questions and answers in that chat, and a short summary: this period’s totals, your budget and rent, and your last 20 expenses. Never your full history. It goes the same way, to an AI model (currently Anthropic’s Claude Haiku, run by Google).</T>
      </Card>
      <Card>
        <T variant="bodyStrong">When you open Wrapped</T>
        <T>Numbers only, so Bud can write a line for each page: the share of your budget used, your top category and its share, what you kept or went over, your treat count and best streak. No expense names or places. Same way, same model.</T>
      </Card>
      <Card>
        <T variant="bodyStrong">Nothing is kept</T>
        <T>Senbud doesn’t store or log any of it, and only providers that keep no data are used.</T>
      </Card>
      <Card>
        <T variant="bodyStrong">Never leaves the phone</T>
        <T>Every expense you type, friends’ names, treats and the treat jar. Typing what you spent works with AI or without it.</T>
      </Card>
    </>
  );
}

let settle: ((ok: boolean) => void) | null = null;

/** Opens the "Bud uses AI" sheet; resolves true once the person allows, false if they close it. */
export function askAiConsent() {
  settle?.(false);
  return new Promise<boolean>((resolve) => {
    settle = resolve;
    router.push('/ai-consent');
  });
}

export function settleAiConsent(ok: boolean) {
  settle?.(ok);
  settle = null;
}
