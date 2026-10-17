import { describe, expect, it } from "vitest";
import { CLASSES, type MonsterId } from "./data";
import { act, actions, afford, committed, endingFor, newGame, type State } from "./engine";

/** Put a specific monster in front of the player with an otherwise-empty floor. */
function facing(s: State, monster: MonsterId, cost: number, patch: Partial<State> = {}): State {
  return { ...s, queue: [], encounter: { monster, cost }, ...patch };
}

/** Find an rng seed whose next resist roll succeeds (or fails) against this state. */
function rngFor(s: State, success: boolean): number {
  for (let seed = 1; seed < 10_000; seed++) {
    const roll = act({ ...s, rng: seed }, { type: "resist" }).log.find((e) => e.kind === "roll");
    if (roll && roll.kind === "roll" && roll.success === success && roll.d20 !== 1 && roll.d20 !== 20) return seed;
  }
  throw new Error("no seed found");
}

describe("newGame", () => {
  it("starts on floor 1 with class gold and the first encounter", () => {
    for (const cls of ["scholar", "freelancer", "homeCook"] as const) {
      const s = newGame(cls, 1);
      expect(s.floor).toBe(1);
      expect(s.gold).toBe(CLASSES[cls].gold);
      expect(s.castsLeft).toBe(3);
      expect(s.encounter?.monster).toBe("impulseGoblin");
    }
  });

  it("is deterministic for a seed", () => {
    const play = (seed: number) => {
      let s = newGame("freelancer", seed);
      while (!s.ending) s = act(s, actions(s)[0]);
      return [s.gold, s.morale, s.ending];
    };
    expect(play(42)).toEqual(play(42));
  });
});

describe("actions", () => {
  it("only offers legal moves", () => {
    const s = facing(newGame("scholar", 1), "grabGolem", 8);
    expect(actions(s).map((a) => a.type)).not.toContain("resist");
    expect(actions(s).map((a) => a.type)).not.toContain("flee");
    expect(() => act(s, { type: "resist" })).toThrow();
  });

  it("party split can't touch rent", () => {
    const s = facing(newGame("scholar", 1), "rentDragon", 40, { floor: 5 });
    expect(actions(s)).not.toContainEqual({ type: "cast", spell: "partySplit" });
  });
});

describe("rent dragon", () => {
  it("defeats you when you can't pay", () => {
    const s = facing(newGame("scholar", 1), "rentDragon", 40, { floor: 5, gold: 39 });
    expect(act(s, { type: "pay" }).ending).toBe("slainByRent");
  });

  it("marks rent paid and moves on", () => {
    const s = facing(newGame("scholar", 1), "rentDragon", 40, { floor: 5, gold: 50 });
    const after = act(s, { type: "pay" });
    expect(after.rentPaid).toBe(true);
    expect(after.gold).toBe(10);
    expect(after.floor).toBe(6);
  });
});

describe("late-fee lich", () => {
  const before = (patch: Partial<State>) => facing(newGame("scholar", 1), "impulseGoblin", 5, { floor: 3, ...patch });

  it("appears on floor 4 when rent money is short", () => {
    expect(act(before({ gold: 39 }), { type: "pay" }).encounter?.monster).toBe("lateFeeLich");
    expect(act(before({ gold: 60 }), { type: "pay" }).encounter?.monster).toBe("impulseGoblin");
  });

  it("is blocked once by Ward of Budget", () => {
    const after = act(before({ gold: 39, ward: true }), { type: "pay" });
    expect(after.encounter?.monster).toBe("impulseGoblin");
    expect(after.ward).toBe(false);
  });

  it("refunds an unneeded Ward of Budget when rent money is safe", () => {
    const after = act(before({ gold: 60, ward: true, castsLeft: 2 }), { type: "pay" });
    expect(after.encounter?.monster).not.toBe("lateFeeLich");
    expect(after.ward).toBe(false);
    expect(after.castsLeft).toBe(3);
    expect(after.log).toContainEqual({ kind: "wardUnused" });
  });
});

describe("gold", () => {
  it("never goes below $0 when a bill costs more than you have", () => {
    const after = act(facing(newGame("scholar", 1), "textbookTroll", 15, { floor: 2, gold: 3 }), { type: "pay" });
    expect(after.gold).toBe(0);
    expect(after.spent).toBe(3);
    expect(after.log).toContainEqual({ kind: "pay", monster: "textbookTroll", amount: 3 });
  });

  it("treats a craving you can't afford as walking away", () => {
    const broke = facing(newGame("scholar", 1), "cravingWraith", 6, { floor: 2, gold: 0 });
    const after = act(broke, { type: "pay" });
    expect(after.treats).toBe(broke.treats);
    expect(after.morale).toBe(broke.morale - 1); // walking away costs what fleeing costs
    expect(after.log).toContainEqual({ kind: "fled", monster: "cravingWraith" });
    const paid = act(facing(newGame("scholar", 1), "cravingWraith", 6, { floor: 2, gold: 20 }), { type: "pay" });
    expect(paid.treats).toBe(1);
  });
});

describe("classes", () => {
  it("home cook's boredom imp visits Tue, Thu and Sat (Wed only via the random encounter)", () => {
    const impFloors = new Set<number>();
    for (let seed = 1; seed < 100; seed++) {
      let s = newGame("homeCook", seed);
      while (!s.ending) {
        if (s.encounter?.monster === "boredomImp") impFloors.add(s.floor);
        s = act(s, s.encounter?.monster === "rentDragon" ? { type: "pay" } : actions(s).at(-1)!);
      }
    }
    expect([...impFloors].sort()).toEqual([2, 3, 4, 6]);
  });

  it("home cook pays half for food", () => {
    let s = newGame("homeCook", 3);
    while (s.encounter?.monster !== "cravingWraith") s = act(s, actions(s)[0]);
    expect(s.encounter.cost).toBe(3);
  });

  it("freelancer is only paid on floors 2, 4 and 6", () => {
    for (let seed = 1; seed < 200; seed++) {
      let s = newGame("freelancer", seed);
      const paidOn: number[] = [];
      while (!s.ending) {
        s = act(s, actions(s)[0]);
        if (s.log.some((e) => e.kind === "income")) paidOn.push(s.floor);
      }
      for (const f of paidOn) expect([2, 4, 6]).toContain(f);
    }
  });
});

describe("subscription slime", () => {
  const slime = () => facing(newGame("scholar", 1), "subscriptionSlime", 5, { floor: 2 });

  it("comes back two floors later when paid", () => {
    expect(act(slime(), { type: "pay" }).slimeDue).toBe(4);
  });

  it("is gone for good when resisted (cancelled)", () => {
    const s = slime();
    const after = act({ ...s, rng: rngFor(s, true) }, { type: "resist" });
    expect(after.slimeDue).toBeNull();
    expect(after.log.some((e) => e.kind === "cancelled")).toBe(true);
  });
});

describe("resist", () => {
  it("a failed resist against the goblin only loses 5", () => {
    const s = facing(newGame("freelancer", 1), "impulseGoblin", 14, { floor: 1 });
    const after = act({ ...s, rng: rngFor(s, false) }, { type: "resist" });
    expect(after.log).toContainEqual({ kind: "pay", monster: "impulseGoblin", amount: 5 });
  });

  it("burnout makes resisting harder", () => {
    const s = facing(newGame("freelancer", 1), "impulseGoblin", 10, { morale: 0 });
    const roll = act(s, { type: "resist" }).log.find((e) => e.kind === "roll");
    expect(roll?.kind === "roll" && roll.total - roll.d20).toBe(-3);
  });
});

describe("spells", () => {
  it("party split halves the bill", () => {
    const s = facing(newGame("scholar", 1), "textbookTroll", 30, { floor: 3 });
    const after = act(s, { type: "cast", spell: "partySplit" });
    expect(after.gold).toBe(s.gold - 15);
    expect(after.castsLeft).toBe(2);
  });

  it("hours sight adds +4 to the next resist only", () => {
    const s = facing(newGame("freelancer", 1), "impulseGoblin", 10, { queue: ["impulseGoblin"] });
    const sighted = act(s, { type: "cast", spell: "hoursSight" });
    expect(sighted.nextResistBonus).toBe(4);
    const rolled = act(sighted, { type: "resist" });
    const roll = rolled.log.find((e) => e.kind === "roll");
    expect(roll?.kind === "roll" && roll.total - roll.d20).toBe(4);
    expect(rolled.nextResistBonus).toBe(0);
  });

  it("ward of budget can't be cast from floor 4 on", () => {
    const s = facing(newGame("scholar", 1), "impulseGoblin", 10, { floor: 4 });
    expect(actions(s)).not.toContainEqual({ type: "cast", spell: "wardOfBudget" });
  });

  it("snap scroll on the rent dragon still needs the gold", () => {
    const s = facing(newGame("scholar", 1), "rentDragon", 40, { floor: 5, gold: 30 });
    expect(act(s, { type: "cast", spell: "snapScroll" }).ending).toBe("slainByRent");
  });

  it("snap scroll pays in full and adds discipline", () => {
    const s = facing(newGame("scholar", 1), "grabGolem", 8);
    const after = act(s, { type: "cast", spell: "snapScroll" });
    expect(after.gold).toBe(s.gold - 8);
    expect(after.discipline).toBe(1);
  });
});

describe("can I afford it", () => {
  it("counts rent and known bills", () => {
    const s = newGame("scholar", 1); // facing the goblin on Monday
    expect(committed(s)).toBe(8 + 30 + 40 + 8); // grab, troll, rent, grab
    expect(afford(s, 5)).toEqual({ left: 95 - 5 - 86, ok: true });
    expect(afford(s, 10).ok).toBe(false);
  });
});

describe("endings", () => {
  it.each([
    [{ rentPaid: false, gold: 99, morale: 5 }, "slainByRent"],
    [{ rentPaid: true, gold: 10, morale: 3 }, "budgetPaladin"],
    [{ rentPaid: true, gold: 2, morale: 5 }, "treatBard"],
    [{ rentPaid: true, gold: 30, morale: 1 }, "lonelyMiser"],
    [{ rentPaid: true, gold: 4, morale: 2 }, "ramenRanger"],
  ] as const)("%o -> %s", (s, ending) => {
    expect(endingFor(s)).toBe(ending);
  });
});
