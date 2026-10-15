import { describe, expect, it } from "vitest";
import type { ClassId } from "./data";
import { miser, pct, randomPolicy, sensible, simulate, spender } from "./simulate";

const CLASSES: ClassId[] = ["scholar", "freelancer", "homeCook"];

describe("balance (10,000 seeded runs per class)", () => {
  const results = CLASSES.map((cls) => ({
    cls,
    sensible: simulate(cls, () => sensible),
    spender: simulate(cls, () => spender),
    miser: simulate(cls, () => miser),
    random: simulate(cls, randomPolicy),
  }));

  it("prints the table", () => {
    const rows = results.flatMap((r) =>
      (["sensible", "spender", "miser", "random"] as const).map((p) => ({
        class: r.cls,
        player: p,
        paladin: pct(r[p], "budgetPaladin"),
        ramen: pct(r[p], "ramenRanger"),
        bard: pct(r[p], "treatBard"),
        miser: pct(r[p], "lonelyMiser"),
        slain: pct(r[p], "slainByRent"),
      })),
    );
    console.table(rows);
  });

  it.each(CLASSES)("%s: a sensible player is Budget Paladin about 40% of the time", (cls) => {
    const r = results.find((x) => x.cls === cls)!;
    expect(pct(r.sensible, "budgetPaladin")).toBeGreaterThanOrEqual(30);
    expect(pct(r.sensible, "budgetPaladin")).toBeLessThanOrEqual(55);
  });

  it.each(CLASSES)("%s: blowing money on everything usually loses to rent", (cls) => {
    const r = results.find((x) => x.cls === cls)!;
    expect(pct(r.spender, "slainByRent")).toBeGreaterThan(60);
  });

  it.each(CLASSES)("%s: refusing every treat rarely makes a Paladin", (cls) => {
    const r = results.find((x) => x.cls === cls)!;
    expect(pct(r.miser, "budgetPaladin")).toBeLessThan(pct(r.sensible, "budgetPaladin"));
  });
});
