import { describe, expect, it } from "vitest";
import { LOCAL, mealExample, parseSpending, quickAddExample } from "./index";

describe("local examples", () => {
  it.each(Object.keys(LOCAL))("%s examples parse back into the right categories", (code) => {
    const [drink, ride] = parseSpending(quickAddExample(code), code);
    expect(drink).toMatchObject({ amount: LOCAL[code].drink[1], category: "Treat" });
    expect(ride).toMatchObject({ amount: LOCAL[code].ride[1], category: "Transport" });
    expect(parseSpending(mealExample(code), code)[0]).toMatchObject({ amount: LOCAL[code].meal[1], category: "Food" });
  });
  it("falls back to plain words for a currency without a line", () => {
    expect(quickAddExample("XYZ")).toBe("coffee 4.50, bus 2");
  });
});
