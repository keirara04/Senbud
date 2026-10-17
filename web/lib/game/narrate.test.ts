import { describe, expect, it } from "vitest";
import { act, newGame, type State } from "./engine";
import { daysToRent, hoursLabel, hoursOfWork, narrate, narrateAll, shareText } from "./narrate";

describe("narrate", () => {
  it("speaks every event kind", () => {
    expect(narrate({ kind: "floor", floor: 3 })).toBe("Wed. A new day in the dungeon.");
    expect(narrate({ kind: "pay", monster: "grabGolem", amount: 8 })).toBe("You paid $8 to the Grab Golem.");
    expect(narrate({ kind: "roll", d20: 14, total: 16, dc: 12, success: true })).toContain("resisted!");
    expect(narrate({ kind: "warded", monster: "lateFeeLich" })).toContain("Ward of Budget");
    expect(narrate({ kind: "wardUnused" })).toContain("refunded");
    expect(narrate({ kind: "cancelled", monster: "subscriptionSlime" })).toContain("cancelled");
    expect(narrate({ kind: "morale", delta: -1 })).toBe("Morale -1.");
    expect(narrate({ kind: "end", ending: "budgetPaladin" })).toContain("Budget Paladin");
  });

  it("narrates a real turn in order", () => {
    const s = newGame("scholar", 7);
    const lines = narrateAll(act(s, { type: "pay" }).log);
    expect(lines[0]).toMatch(/^You paid \$\d+ to the Impulse Goblin\.$/);
    expect(lines.at(-1)).toContain("Grab Golem appears");
  });
});

describe("hoursOfWork", () => {
  it("rounds to half hours at $12/hr", () => {
    expect(hoursOfWork(60)).toBe(5);
    expect(hoursOfWork(8)).toBe(0.5);
    expect(hoursOfWork(0)).toBe(0);
  });
});

describe("hoursLabel", () => {
  it("uses the singular for exactly one hour", () => {
    expect(hoursLabel(12)).toBe("1 hr");
    expect(hoursLabel(6)).toBe("0.5 hrs");
    expect(hoursLabel(60)).toBe("5 hrs");
  });
});

describe("daysToRent", () => {
  it("counts down to Friday and stops once paid", () => {
    expect(daysToRent({ floor: 1, rentPaid: false })).toBe(4);
    expect(daysToRent({ floor: 5, rentPaid: false })).toBe(0);
    expect(daysToRent({ floor: 6, rentPaid: true })).toBeNull();
  });
});

describe("shareText", () => {
  it("summarises the run without going negative", () => {
    const s = { ...newGame("homeCook", 1), ending: "ramenRanger", gold: -3, treats: 1, spent: 60 } as State;
    expect(shareText(s)).toBe(
      "I'm a Ramen Ranger 🛡️\nHome Cook · $0 left · 1 treat\nSpent $60 (5 hrs of work).\nCan you survive the week?",
    );
  });
});
