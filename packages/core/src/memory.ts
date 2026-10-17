// Bud remembers (build plan P3.5): which kept lines go with a question. At most 5, so the request stays
// small and "What gets sent" stays true. Lines sharing words with the question come first, then the
// newest. Lines are given newest first.
// ponytail: word overlap, not meaning ("payday" won't match "gaji"); embeddings if it misses in practice.
const words = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);

export function pickMemories(lines: string[], question: string, max = 5): string[] {
  const q = words(question);
  return lines
    .map((text, i) => ({ text, i, shared: [...words(text)].filter((w) => q.has(w)).length }))
    .sort((a, b) => b.shared - a.shared || a.i - b.i)
    .slice(0, max)
    .map((m) => m.text);
}
