import { describe, expect, it } from "vitest";
import { pickMemories } from "./memory";

describe("pickMemories", () => {
  const lines = ["Prefers short answers", "Paid on the 25th", "Saving for a laptop by March", "Vegetarian, cooks most nights", "Wants Food under 300", "Shares rent with 2 housemates"];
  it("puts lines that share words with the question first, then the newest, at most 5", () => {
    expect(pickMemories(lines, "how's my laptop saving going?")).toEqual(["Saving for a laptop by March", "Prefers short answers", "Paid on the 25th", "Vegetarian, cooks most nights", "Wants Food under 300"]);
    expect(pickMemories(lines, "can I spend more on food?")[0]).toBe("Wants Food under 300");
    expect(pickMemories(lines, "hello", 2)).toEqual(["Prefers short answers", "Paid on the 25th"]);
    expect(pickMemories([], "anything")).toEqual([]);
  });
});
