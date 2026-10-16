import { describe, expect, it } from "vitest";
import { jarFill, pickNudge, stamps } from "./index";
import type { Iou, Subscription, Treat } from "./types";

describe("stamps", () => {
  it("fills one stamp per 10% of the limit, rounded", () => {
    expect(stamps(24800, 40000)).toEqual({ filled: 6, over: false, left: 15200, status: "ok" });
    expect(stamps(500, 40000)?.filled).toBe(0);
  });
  it("is close from 90% and over past the limit, with all ten filled", () => {
    expect(stamps(37600, 40000)).toMatchObject({ filled: 9, over: false, status: "close" });
    expect(stamps(41200, 40000)).toEqual({ filled: 10, over: true, left: -1200, status: "over" });
  });
  it("has nothing to stamp without a limit", () => {
    expect(stamps(1000, undefined)).toBeNull();
    expect(stamps(1000, 0)).toBeNull();
  });
});

describe("jarFill", () => {
  it("fills toward the goal", () => {
    expect(jarFill(4650, 6000)).toEqual({ share: 0.775, percent: 77, reached: false, toGo: 1350 });
  });
  it("reaches the goal and can overflow", () => {
    expect(jarFill(6190, 6000)).toMatchObject({ percent: 100, reached: true, toGo: 0 });
    expect(jarFill(6190, 6000)!.share).toBeGreaterThan(1);
  });
  it("has no fill without a goal", () => expect(jarFill(500, undefined)).toBeNull());
});

describe("pickNudge", () => {
  const today = "2026-10-16";
  const netflix: Subscription = { merchant: "Netflix", cents: 1700, interval: "month", nextDate: "2026-10-17", confirmed: true };
  const iou: Iou = { friend: "Sarah", cents: 1400, direction: "theyOweMe", note: "Dinner", date: "2026-10-01", paid: false };
  const tealive: Treat = { name: "Tealive", lastCents: 900, lastDate: "2026-10-01", minDaysBetween: 7 };
  const base = { today, subscriptions: [], ious: [], treats: [], safe: { perDay: 2500, covered: true }, onTrack: true };

  it("prefers a renewal tomorrow, then an old IOU, then a treat", () => {
    expect(pickNudge({ ...base, subscriptions: [netflix], ious: [iou], treats: [tealive] })?.kind).toBe("renewal");
    expect(pickNudge({ ...base, ious: [iou], treats: [tealive] })?.kind).toBe("iou");
    expect(pickNudge({ ...base, treats: [tealive] })?.kind).toBe("treat");
  });
  it("skips unconfirmed subscriptions and IOUs you owe", () => {
    expect(pickNudge({ ...base, subscriptions: [{ ...netflix, confirmed: false }], ious: [{ ...iou, direction: "iOweThem" }] })).toBeNull();
  });
  it("never nudges a treat when spending isn't on track", () => {
    expect(pickNudge({ ...base, treats: [tealive], onTrack: false })).toBeNull();
  });
});

describe("splitByItems", () => {
  it("gives each person their items and splits shared ones evenly, leftover cents to the payer", async () => {
    const { splitByItems } = await import("./index");
    const items = [
      { cents: 1200, owners: ["You"] as const },
      { cents: 930, owners: ["Aiman"] as const },
      { cents: 1000, owners: ["You", "Aiman", "Sarah"] as const },
    ];
    const shares = splitByItems(items.map((i) => ({ cents: i.cents, owners: [...i.owners] })), ["You", "Aiman", "Sarah"], "You");
    expect(shares).toEqual({ You: 1200 + 334, Aiman: 930 + 333, Sarah: 333 });
    expect(shares.You + shares.Aiman + shares.Sarah).toBe(3130);
  });
  it("skips items nobody claimed", async () => {
    const { splitByItems } = await import("./index");
    expect(splitByItems([{ cents: 500, owners: [] }], ["You", "Sarah"], "You")).toEqual({ You: 0, Sarah: 0 });
  });
});

describe("toCsv", () => {
  it("writes major units and quotes labels with commas or quotes", async () => {
    const { toCsv } = await import("./index");
    const csv = toCsv([{ date: "2026-10-16", cents: 450, label: 'Kopi, "large"', category: "Food" }], "MYR");
    expect(csv.split("\n")).toEqual(["date,amount,currency,label,category,source", '2026-10-16,4.5,MYR,"Kopi, ""large""",Food,manual']);
  });
});

describe("readIntent", () => {
  it("routes lines by rules", async () => {
    const { readIntent } = await import("./index");
    expect(readIntent("can I afford a RM 45 ticket on saturday?")).toEqual({ kind: "afford", amount: 45, label: "Ticket on saturday" });
    expect(readIntent("can I afford it")).toEqual({ kind: "afford", label: "" });
    expect(readIntent("badminton court 32 split with aiman and sarah")).toEqual({ kind: "split", amount: 32, label: "Badminton court", people: ["Aiman", "Sarah"] });
    expect(readIntent("how's my month?")).toEqual({ kind: "month" });
    expect(readIntent("How’s my month?")).toEqual({ kind: "month" });
    expect(readIntent("kopi 4.50, grab 12").kind).toBe("add");
    expect(readIntent("how much did I spend on grab this month?")).toEqual({ kind: "ask" });
    expect(readIntent("hello")).toEqual({ kind: "ask" });
  });
});
