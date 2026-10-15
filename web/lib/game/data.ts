// The Budget Dungeon: static rules data. See docs/senbud-play-game-spec.md.

export type ClassId = "scholar" | "freelancer" | "homeCook";

export type MonsterId =
  | "impulseGoblin"
  | "subscriptionSlime"
  | "cravingWraith"
  | "grabGolem"
  | "boredomImp"
  | "textbookTroll"
  | "lateFeeLich"
  | "rentDragon";

export type SpellId = "snapScroll" | "partySplit" | "hoursSight" | "wardOfBudget";

export type ClassDef = {
  name: string;
  gold: number;
  resistBonus: number;
  blurb: string;
};

export const CLASSES: Record<ClassId, ClassDef> = {
  scholar: { name: "Scholar", gold: 95, resistBonus: 2, blurb: "+2 to resist. Textbooks hurt more." },
  freelancer: { name: "Freelancer", gold: 60, resistBonus: 0, blurb: "Clients sometimes pay. Sometimes." },
  homeCook: { name: "Home Cook", gold: 115, resistBonus: 0, blurb: "Food costs half. Boredom visits every other day." },
};

export type MonsterDef = {
  name: string;
  /** Fixed cost, or [min, max] rolled when the monster appears. */
  cost: number | [number, number];
  /** Resist difficulty. null = can't be resisted. */
  dc: number | null;
  /** Can be fled from (morale -1). */
  fleeable: boolean;
  food: boolean;
  line: string;
};

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  impulseGoblin: {
    name: "Impulse Goblin",
    cost: [5, 15],
    dc: 12,
    fleeable: true,
    food: false,
    line: "FLASH SALE! Only today!",
  },
  subscriptionSlime: {
    name: "Subscription Slime",
    cost: 5,
    dc: 10,
    fleeable: false,
    food: false,
    line: "Your free trial has ended~",
  },
  cravingWraith: {
    name: "Craving Wraith",
    cost: 6,
    dc: 11,
    fleeable: true,
    food: true,
    line: "Big Mac... you deserve it...",
  },
  grabGolem: { name: "Grab Golem", cost: 8, dc: null, fleeable: false, food: false, line: "Campus is far. Pay the fare." },
  boredomImp: { name: "Boredom Imp", cost: 5, dc: null, fleeable: true, food: false, line: "Sooo bored. Entertain me." },
  textbookTroll: { name: "Textbook Troll", cost: 25, dc: null, fleeable: false, food: false, line: "Required reading. No used copies." },
  lateFeeLich: { name: "Late-Fee Lich", cost: 10, dc: null, fleeable: false, food: false, line: "Rent money looking thin..." },
  rentDragon: { name: "Rent Dragon", cost: 40, dc: null, fleeable: false, food: false, line: "RENT. IS. DUE." },
};

export const SPELLS: Record<SpellId, { name: string; feature: string; blurb: string }> = {
  snapScroll: { name: "Snap Scroll", feature: "Receipt capture", blurb: "Pay in full, +1 discipline for the run." },
  partySplit: { name: "Party Split", feature: "Split with friends", blurb: "A friend covers half this one." },
  hoursSight: { name: "Hours Sight", feature: "Hours of work", blurb: "+4 to your next resist." },
  wardOfBudget: { name: "Ward of Budget", feature: "Pace reminders", blurb: "Blocks the Late-Fee Lich once." },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const FLOORS = DAYS.length;
export const RENT_FLOOR = 5;
export const LICH_FLOOR = 4;
export const RENT_RESERVE = 40;
export const CASTS = 3;
export const START_MORALE = 3;
export const MAX_MORALE = 5;
export const FREELANCER_PAY_FLOORS = [2, 4, 6];
export const IMP_FLOORS = [2, 4, 6];
export const FREELANCER_PAY = 25;
export const SCHOLAR_TROLL_COST = 30;
export const SLIME_EVERY = 2;
export const BURNOUT_PENALTY = 3;

/** Scripted encounters per floor (1-based). "random" draws from RANDOM_POOL. */
export const FLOOR_PLAN: Record<number, (MonsterId | "random")[]> = {
  1: ["impulseGoblin", "grabGolem"],
  2: ["cravingWraith", "subscriptionSlime"],
  3: ["textbookTroll", "random"],
  4: ["impulseGoblin"],
  5: ["rentDragon"],
  6: ["cravingWraith", "grabGolem"],
  7: ["impulseGoblin"],
};

export const RANDOM_POOL: MonsterId[] = ["impulseGoblin", "cravingWraith", "boredomImp"];

export type EndingId = "budgetPaladin" | "ramenRanger" | "treatBard" | "lonelyMiser" | "slainByRent";

export const ENDINGS: Record<EndingId, { title: string; line: string }> = {
  budgetPaladin: { title: "Budget Paladin", line: "Rent slain, treats enjoyed. Legend." },
  ramenRanger: { title: "Ramen Ranger", line: "You survived... on instant noodles." },
  treatBard: { title: "Treat Bard", line: "Fun week. Your wallet disagrees." },
  lonelyMiser: { title: "Lonely Miser", line: "Rich, but you skipped every treat. Was it worth it?" },
  slainByRent: { title: "Slain by Rent", line: "Senbud would've warned you on Wednesday 😉" },
};
