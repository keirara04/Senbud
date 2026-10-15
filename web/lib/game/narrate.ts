// Turns engine events into the story text the player (and screen readers) see.

import { CLASSES, DAYS, ENDINGS, MONSTERS, SPELLS } from "./data";
import type { Event, State } from "./engine";

/** Part-time hourly rate the game assumes for "hours of work". Shown to the player as an assumption. */
export const HOURLY_RATE = 12;

export const hoursOfWork = (amount: number) => Math.round((amount / HOURLY_RATE) * 2) / 2;

/** "0.5 hrs", "1 hr", "5 hrs" */
export function hoursLabel(amount: number): string {
  const h = hoursOfWork(amount);
  return `${h} ${h === 1 ? "hr" : "hrs"}`;
}

const money = (n: number) => `$${n}`;

export function narrate(e: Event): string | null {
  switch (e.kind) {
    case "floor":
      return `${DAYS[e.floor - 1]}. A new day in the dungeon.`;
    case "income":
      return `A client paid! +${money(e.amount)}.`;
    case "appear":
      return `${MONSTERS[e.monster].name} appears: “${MONSTERS[e.monster].line}”`;
    case "pay":
      return `You paid ${money(e.amount)} to the ${MONSTERS[e.monster].name}.`;
    case "roll":
      return `Rolled ${e.d20} (total ${e.total} vs ${e.dc}): ${e.success ? "resisted!" : "failed."}`;
    case "resisted":
      return `You walked past the ${MONSTERS[e.monster].name}. $0 spent.`;
    case "fled":
      return `You fled the ${MONSTERS[e.monster].name}. Free, but you feel a bit worse.`;
    case "cast":
      return `You cast ${SPELLS[e.spell].name}.`;
    case "warded":
      return "Your Ward of Budget held: the Late-Fee Lich never showed up.";
    case "cancelled":
      return "Subscription cancelled. The Slime won't be back.";
    case "morale":
      return e.delta > 0 ? `Morale +${e.delta}.` : `Morale ${e.delta}.`;
    case "end":
      return `${ENDINGS[e.ending].title}. ${ENDINGS[e.ending].line}`;
  }
}

export function narrateAll(events: Event[]): string[] {
  return events.map(narrate).filter((l): l is string => l !== null);
}

/** Floors until the Rent Dragon, or null once it's been dealt with. */
export function daysToRent(s: Pick<State, "floor" | "rentPaid">, rentFloor = 5): number | null {
  return s.rentPaid || s.floor > rentFloor ? null : rentFloor - s.floor;
}

export function shareText(s: State): string {
  const e = ENDINGS[s.ending!];
  const bits = [
    `I'm a ${e.title} ${s.ending === "slainByRent" ? "💀" : "🛡️"}`,
    `${CLASSES[s.cls].name} · $${Math.max(0, s.gold)} left · ${s.treats} treat${s.treats === 1 ? "" : "s"}`,
    `Spent $${s.spent} (${hoursLabel(s.spent)} of work).`,
    "Can you survive the week?",
  ];
  return bits.join("\n");
}
