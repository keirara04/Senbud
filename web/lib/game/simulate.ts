// Balance tooling: play many seeded runs with simple strategies and tally endings.

import type { ClassId, EndingId } from "./data";
import { type Action, act, actions, afford, canAct, newGame, type State } from "./engine";

export type Policy = (s: State) => Action;

const UNAVOIDABLE = new Set(["grabGolem", "textbookTroll", "lateFeeLich", "rentDragon"]);

/** A reasonable player: protects rent, treats themself when it fits, cancels subscriptions. */
export const sensible: Policy = (s) => {
  const e = s.encounter!;
  const m = e.monster;
  const can = (a: Action) => canAct(s, a);
  const left = afford(s, e.cost).left;

  if (s.floor === 3 && s.gold - e.cost < 45 && can({ type: "cast", spell: "wardOfBudget" })) {
    return { type: "cast", spell: "wardOfBudget" };
  }
  if (UNAVOIDABLE.has(m)) {
    if (m === "textbookTroll" && left < 10 && can({ type: "cast", spell: "partySplit" })) {
      return { type: "cast", spell: "partySplit" };
    }
    return { type: "pay" };
  }
  switch (m) {
    case "impulseGoblin":
      if (e.cost >= 12 && s.castsLeft > 1 && can({ type: "cast", spell: "hoursSight" })) {
        return { type: "cast", spell: "hoursSight" };
      }
      return s.morale >= 4 ? { type: "flee" } : { type: "resist" };
    case "cravingWraith":
      return s.morale <= 3 && left >= 5 ? { type: "pay" } : { type: "resist" };
    case "subscriptionSlime":
      return { type: "resist" };
    case "boredomImp":
      return left >= 10 ? { type: "pay" } : { type: "flee" };
  }
  return { type: "pay" };
};

/** Pays for everything. */
export const spender: Policy = () => ({ type: "pay" });

/** Never spends on anything optional. */
export const miser: Policy = (s) => {
  if (canAct(s, { type: "resist" })) return { type: "resist" };
  if (canAct(s, { type: "flee" })) return { type: "flee" };
  return { type: "pay" };
};

/** Uniform random legal move (seeded so results are reproducible). */
export function randomPolicy(seed: number): Policy {
  let x = seed;
  return (s) => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const legal = actions(s);
    return legal[x % legal.length];
  };
}

export function play(cls: ClassId, seed: number, policy: Policy): State {
  let s = newGame(cls, seed);
  for (let guard = 0; !s.ending && guard < 200; guard++) s = act(s, policy(s));
  if (!s.ending) throw new Error(`run did not finish (seed ${seed})`);
  return s;
}

export type Tally = Record<EndingId, number> & { runs: number };

/** `makePolicy` gets the run's seed, so stateful policies (random) stay reproducible. */
export function simulate(cls: ClassId, makePolicy: (seed: number) => Policy, runs = 10_000): Tally {
  const t: Tally = { runs, budgetPaladin: 0, ramenRanger: 0, treatBard: 0, lonelyMiser: 0, slainByRent: 0 };
  for (let seed = 1; seed <= runs; seed++) t[play(cls, seed, makePolicy(seed)).ending!] += 1;
  return t;
}

export const pct = (t: Tally, k: EndingId) => Math.round((t[k] / t.runs) * 1000) / 10;
