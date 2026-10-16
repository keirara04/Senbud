import { expect, it } from "vitest";
import { money, splitBill } from "./demo";

it("formats demo prices in USD", () => {
  expect(money(11.999999999999998)).toBe("$12");
  expect(money(4.5)).toBe("$4.50");
});

it("splits the demo bill with leftover cents to You", () => {
  const s = splitBill([{ label: "Sodas x3", cents: 1150, owner: "Shared" }], "even");
  expect(s).toEqual({ You: 384, Jordan: 383, Sarah: 383 });
});
