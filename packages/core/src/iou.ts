// IOUs from bill splits (spec 4.7). Only debts that involve me are tracked; friends are just names.
import { daysBetween, type IsoDate } from "./dates";
import type { Iou } from "./types";

// Turns splitBill shares into my expense plus IOUs. IOUs don't count as spending.
export function iousFromSplit<P extends string>(
  shares: Record<P, number>,
  payer: P,
  me: P,
  note: string,
  date: IsoDate,
): { myShare: number; ious: Iou[] } {
  const iou = (friend: string, cents: number, direction: Iou["direction"]): Iou =>
    ({ friend, cents, direction, note, date, paid: false });
  const myShare = shares[me];
  if (payer !== me) return { myShare, ious: myShare > 0 ? [iou(payer, myShare, "iOweThem")] : [] };
  const ious = (Object.entries(shares) as [P, number][])
    .filter(([p, cents]) => p !== me && cents > 0)
    .map(([p, cents]) => iou(p, cents, "theyOweMe"));
  return { myShare, ious };
}

// Net unpaid balance per friend: positive = they owe me, negative = I owe them. Settled friends drop out.
export function netBalances(ious: Iou[]): Record<string, number> {
  const net: Record<string, number> = {};
  for (const i of ious) {
    if (i.paid) continue;
    net[i.friend] = (net[i.friend] ?? 0) + (i.direction === "theyOweMe" ? i.cents : -i.cents);
  }
  for (const f of Object.keys(net)) if (net[f] === 0) delete net[f];
  return net;
}

// Settle up with a friend: every unpaid IOU with them is marked paid. Returns a new list.
export const settleUp = (ious: Iou[], friend: string) =>
  ious.map((i) => (i.friend === friend && !i.paid ? { ...i, paid: true } : i));

// IOUs still unpaid after `days` days (spec 5: nudge for one older than 7 days).
export const staleIous = (ious: Iou[], today: IsoDate, days = 7) =>
  ious.filter((i) => !i.paid && daysBetween(i.date, today) > days);
