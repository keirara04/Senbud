// The Budget Dungeon: pure, seeded game engine. No React, no DOM.

import {
  BURNOUT_PENALTY,
  CASTS,
  CLASSES,
  type ClassId,
  type EndingId,
  FLOOR_PLAN,
  FLOORS,
  FREELANCER_PAY,
  FREELANCER_PAY_FLOORS,
  LICH_FLOOR,
  MAX_MORALE,
  MONSTERS,
  type MonsterId,
  RANDOM_POOL,
  RENT_FLOOR,
  RENT_RESERVE,
  SCHOLAR_TROLL_COST,
  SLIME_EVERY,
  type SpellId,
  START_MORALE,
} from "./data";

export type Encounter = { monster: MonsterId; cost: number };

export type Event =
  | { kind: "floor"; floor: number }
  | { kind: "income"; amount: number }
  | { kind: "appear"; monster: MonsterId; cost: number }
  | { kind: "pay"; monster: MonsterId; amount: number }
  | { kind: "roll"; d20: number; total: number; dc: number; success: boolean }
  | { kind: "resisted"; monster: MonsterId }
  | { kind: "fled"; monster: MonsterId }
  | { kind: "cast"; spell: SpellId }
  | { kind: "warded"; monster: MonsterId }
  | { kind: "cancelled"; monster: MonsterId }
  | { kind: "morale"; delta: number }
  | { kind: "end"; ending: EndingId };

export type State = {
  cls: ClassId;
  rng: number;
  floor: number;
  queue: MonsterId[];
  encounter: Encounter | null;
  gold: number;
  morale: number;
  discipline: number;
  castsLeft: number;
  nextResistBonus: number;
  ward: boolean;
  /** Floor the slime next returns on, or null once cancelled/never subscribed. */
  slimeDue: number | null;
  rentPaid: boolean;
  spent: number;
  treats: number;
  ending: EndingId | null;
  log: Event[];
};

export type Action =
  | { type: "pay" }
  | { type: "resist" }
  | { type: "flee" }
  | { type: "cast"; spell: SpellId };

// ---------- seeded RNG (mulberry32), state kept in the game state ----------

function next(s: State): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const d20 = (s: State) => 1 + Math.floor(next(s) * 20);
const between = (s: State, min: number, max: number) => min + Math.floor(next(s) * (max - min + 1));

// ---------- helpers ----------

function costOf(s: State, m: MonsterId): number {
  const def = MONSTERS[m];
  let cost = Array.isArray(def.cost) ? between(s, def.cost[0], def.cost[1]) : def.cost;
  if (m === "textbookTroll" && s.cls === "scholar") cost = SCHOLAR_TROLL_COST;
  if (def.food && s.cls === "homeCook") cost = Math.ceil(cost / 2);
  return cost;
}

function addMorale(s: State, delta: number) {
  const before = s.morale;
  s.morale = Math.max(0, Math.min(MAX_MORALE, s.morale + delta));
  if (s.morale !== before) s.log.push({ kind: "morale", delta: s.morale - before });
}

function spend(s: State, m: MonsterId, amount: number) {
  s.gold -= amount;
  s.spent += amount;
  s.log.push({ kind: "pay", monster: m, amount });
}

function finish(s: State, ending: EndingId) {
  s.ending = ending;
  s.encounter = null;
  s.queue = [];
  s.log.push({ kind: "end", ending });
}

export function endingFor(s: Pick<State, "rentPaid" | "gold" | "morale">): EndingId {
  if (!s.rentPaid) return "slainByRent";
  if (s.gold >= 10 && s.morale >= 3) return "budgetPaladin";
  if (s.morale >= MAX_MORALE && s.gold < 5) return "treatBard";
  if (s.gold >= 10) return "lonelyMiser";
  return "ramenRanger";
}

function startFloor(s: State, floor: number) {
  s.floor = floor;
  s.log.push({ kind: "floor", floor });
  if (s.cls === "freelancer" && FREELANCER_PAY_FLOORS.includes(floor) && next(s) < 0.5) {
    s.gold += FREELANCER_PAY;
    s.log.push({ kind: "income", amount: FREELANCER_PAY });
  }
  const plan: MonsterId[] = FLOOR_PLAN[floor].map((m) =>
    m === "random" ? RANDOM_POOL[Math.floor(next(s) * RANDOM_POOL.length)] : m,
  );
  if (s.cls === "homeCook") plan.unshift("boredomImp");
  if (s.slimeDue === floor && !plan.includes("subscriptionSlime")) plan.push("subscriptionSlime");
  if (floor === LICH_FLOOR && s.gold < RENT_RESERVE) {
    if (s.ward) {
      s.ward = false;
      s.log.push({ kind: "warded", monster: "lateFeeLich" });
    } else {
      plan.unshift("lateFeeLich");
    }
  }
  s.queue = plan;
  advance(s);
}

/** Pull the next encounter, moving to the next floor (or ending) when the floor is clear. */
function advance(s: State) {
  while (!s.ending) {
    const m = s.queue.shift();
    if (m) {
      const cost = costOf(s, m);
      s.encounter = { monster: m, cost };
      s.log.push({ kind: "appear", monster: m, cost });
      return;
    }
    s.encounter = null;
    if (s.floor >= FLOORS) return finish(s, endingFor(s));
    startFloor(s, s.floor + 1);
    return;
  }
}

function clear(s: State) {
  const m = s.encounter!.monster;
  if (m === "subscriptionSlime" && s.slimeDue !== null) s.slimeDue = s.floor + SLIME_EVERY;
  if (m === "rentDragon") s.rentPaid = true;
  s.encounter = null;
  advance(s);
}

// ---------- public API ----------

export function newGame(cls: ClassId, seed: number): State {
  const s: State = {
    cls,
    rng: seed | 0,
    floor: 0,
    queue: [],
    encounter: null,
    gold: CLASSES[cls].gold,
    morale: START_MORALE,
    discipline: 0,
    castsLeft: CASTS,
    nextResistBonus: 0,
    ward: false,
    slimeDue: null,
    rentPaid: false,
    spent: 0,
    treats: 0,
    ending: null,
    log: [],
  };
  startFloor(s, 1);
  return s;
}

/** Bonus added to a d20 resist roll right now. */
export function resistBonus(s: State): number {
  return (
    CLASSES[s.cls].resistBonus + s.discipline + s.nextResistBonus - (s.morale < 1 ? BURNOUT_PENALTY : 0)
  );
}

export function canAct(s: State, a: Action): boolean {
  const e = s.encounter;
  if (s.ending || !e) return false;
  const def = MONSTERS[e.monster];
  switch (a.type) {
    case "pay":
      return true;
    case "resist":
      return def.dc !== null;
    case "flee":
      return def.fleeable;
    case "cast":
      if (s.castsLeft < 1) return false;
      if (a.spell === "partySplit") return e.monster !== "rentDragon" && e.monster !== "lateFeeLich";
      if (a.spell === "hoursSight") return def.dc !== null && s.nextResistBonus === 0;
      if (a.spell === "wardOfBudget") return !s.ward && s.floor < LICH_FLOOR;
      return true;
  }
}

export function actions(s: State): Action[] {
  const all: Action[] = [
    { type: "pay" },
    { type: "resist" },
    { type: "flee" },
    { type: "cast", spell: "snapScroll" },
    { type: "cast", spell: "partySplit" },
    { type: "cast", spell: "hoursSight" },
    { type: "cast", spell: "wardOfBudget" },
  ];
  return all.filter((a) => canAct(s, a));
}

/** Gold still committed to unavoidable costs after the current encounter (rent + known bills). */
export function committed(s: State): number {
  let total = 0;
  const upcoming = [...s.queue];
  for (let f = s.floor + 1; f <= FLOORS; f++) upcoming.push(...(FLOOR_PLAN[f] as MonsterId[]));
  for (const m of upcoming) {
    if (MONSTERS[m].dc === null && MONSTERS[m].fleeable === false) {
      total += m === "textbookTroll" && s.cls === "scholar" ? SCHOLAR_TROLL_COST : (MONSTERS[m].cost as number);
    }
  }
  return total;
}

/** "Can I afford it?" — gold left after paying `cost` now and everything still committed. */
export function afford(s: State, cost: number) {
  const left = s.gold - cost - committed(s);
  return { left, ok: left >= 0 };
}

export function act(prev: State, a: Action): State {
  if (!canAct(prev, a)) throw new Error(`Illegal action ${JSON.stringify(a)}`);
  const s: State = { ...prev, queue: [...prev.queue], log: [] };
  const e = s.encounter!;
  const def = MONSTERS[e.monster];

  if (a.type === "pay") {
    if (e.monster === "rentDragon" && s.gold < e.cost) return finish(s, "slainByRent"), s;
    spend(s, e.monster, e.cost);
    if (e.monster === "cravingWraith" || e.monster === "boredomImp") {
      s.treats += 1;
      addMorale(s, e.monster === "cravingWraith" ? 2 : 1);
    }
    if (e.monster === "subscriptionSlime" && s.slimeDue === null) s.slimeDue = s.floor; // now subscribed
    clear(s);
    return s;
  }

  if (a.type === "flee") {
    s.log.push({ kind: "fled", monster: e.monster });
    addMorale(s, -1);
    clear(s);
    return s;
  }

  if (a.type === "resist") {
    const roll = d20(s);
    const total = roll + resistBonus(s);
    const success = roll === 20 || (roll !== 1 && total >= def.dc!);
    s.nextResistBonus = 0;
    s.log.push({ kind: "roll", d20: roll, total, dc: def.dc!, success });
    if (roll === 20) addMorale(s, 1);
    if (success) {
      if (e.monster === "subscriptionSlime") {
        s.slimeDue = null;
        s.log.push({ kind: "cancelled", monster: e.monster });
        s.encounter = null;
        advance(s);
        return s;
      }
      s.log.push({ kind: "resisted", monster: e.monster });
    } else {
      const base = e.monster === "impulseGoblin" ? Math.min(5, e.cost) : e.cost;
      spend(s, e.monster, base + (roll === 1 ? 2 : 0));
      if (e.monster === "subscriptionSlime" && s.slimeDue === null) s.slimeDue = s.floor;
    }
    clear(s);
    return s;
  }

  // cast
  s.castsLeft -= 1;
  s.log.push({ kind: "cast", spell: a.spell });
  switch (a.spell) {
    case "snapScroll":
      s.discipline += 1;
      return act({ ...s, castsLeft: s.castsLeft }, { type: "pay" }).log.length
        ? mergeLogs(s, act(s, { type: "pay" }))
        : s;
    case "partySplit": {
      const half = Math.ceil(e.cost / 2);
      s.encounter = { ...e, cost: half };
      return mergeLogs(s, act(s, { type: "pay" }));
    }
    case "hoursSight":
      s.nextResistBonus = 4;
      return s;
    case "wardOfBudget":
      s.ward = true;
      return s;
  }
}

function mergeLogs(before: State, after: State): State {
  return { ...after, log: [...before.log, ...after.log] };
}
