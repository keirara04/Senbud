// Home's "Today" card (spec 5). Rent (priority 1) and pace (2) live inside their own cards, so this
// only picks among 3–5: a renewal tomorrow, an IOU older than 7 days, then a treat when all is well.
import { addDays, type IsoDate } from "./dates";
import { treatNudge } from "./budget";
import { staleIous } from "./iou";
import type { Iou, Subscription, Treat } from "./types";

export type Nudge =
  | { kind: "renewal"; subscription: Subscription }
  | { kind: "iou"; iou: Iou }
  | { kind: "treat"; treat: Treat };

export function pickNudge(opts: {
  today: IsoDate;
  subscriptions: Subscription[];
  ious: Iou[];
  treats: Treat[];
  safe: { perDay: number; covered: boolean };
  onTrack: boolean;
}): Nudge | null {
  const { today, subscriptions, ious, treats, safe, onTrack } = opts;
  const renewal = subscriptions.find((s) => s.confirmed && s.nextDate === addDays(today, 1));
  if (renewal) return { kind: "renewal", subscription: renewal };
  const iou = staleIous(ious, today).find((i) => i.direction === "theyOweMe");
  if (iou) return { kind: "iou", iou };
  // A treat only when nothing else needs attention.
  const treat = onTrack ? treats.find((t) => treatNudge(t, safe, today)) : undefined;
  return treat ? { kind: "treat", treat } : null;
}
