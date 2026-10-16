import { describe, expect, it } from "vitest";
import { splitBill } from "./index";
import { iousFromSplit, netBalances, settleUp, staleIous } from "./iou";
import type { Iou } from "./types";

const people = ["Me", "Sarah", "Aiman"] as const;
const dinner = [{ label: "Dinner", cents: 4_200, owner: "Shared" as const }];

describe("iousFromSplit", () => {
  it("when I paid, everyone else owes me their share", () => {
    const shares = splitBill(dinner, "even", people, "Me");
    expect(iousFromSplit(shares, "Me", "Me", "Friday dinner", "2026-10-16")).toEqual({
      myShare: 1_400,
      ious: [
        { friend: "Sarah", cents: 1_400, direction: "theyOweMe", note: "Friday dinner", date: "2026-10-16", paid: false },
        { friend: "Aiman", cents: 1_400, direction: "theyOweMe", note: "Friday dinner", date: "2026-10-16", paid: false },
      ],
    });
  });
  it("when a friend paid, I owe them my share only", () => {
    const shares = splitBill([{ label: "Pizza", cents: 1_001, owner: "Shared" }], "even", people, "Sarah");
    expect(iousFromSplit(shares, "Sarah", "Me", "Pizza", "2026-10-16")).toEqual({
      myShare: 333,
      ious: [{ friend: "Sarah", cents: 333, direction: "iOweThem", note: "Pizza", date: "2026-10-16", paid: false }],
    });
  });
  it("skips people with nothing to pay", () => {
    const shares = splitBill([{ label: "Nasi", cents: 1_200, owner: "Sarah" }], "items", people, "Me");
    expect(iousFromSplit(shares, "Me", "Me", "Lunch", "2026-10-16").ious.map((i) => i.friend)).toEqual(["Sarah"]);
  });
});

describe("balances", () => {
  const iou = (friend: string, cents: number, direction: Iou["direction"], date = "2026-10-01", paid = false): Iou => ({
    friend,
    cents,
    direction,
    note: "",
    date,
    paid,
  });
  const ious = [
    iou("Sarah", 1_400, "theyOweMe"),
    iou("Sarah", 500, "iOweThem"),
    iou("Aiman", 1_000, "theyOweMe", "2026-10-01", true),
    iou("Ben", 300, "iOweThem", "2026-10-09"),
    iou("Cy", 200, "theyOweMe"),
    iou("Cy", 200, "iOweThem"),
  ];
  it("nets unpaid IOUs per friend; settled and even friends drop out", () => {
    expect(netBalances(ious)).toEqual({ Sarah: 900, Ben: -300 });
  });
  it("settles up every unpaid IOU with one friend, without mutating", () => {
    const after = settleUp(ious, "Sarah");
    expect(netBalances(after)).toEqual({ Ben: -300 });
    expect(ious[0].paid).toBe(false);
  });
  it("finds unpaid IOUs older than 7 days", () => {
    expect(staleIous(ious, "2026-10-16").map((i) => i.friend)).toEqual(["Sarah", "Sarah", "Cy", "Cy"]);
  });
});
