"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Camera, Check, CornerDownLeft, Keyboard, MessageCircleQuestion, ScanLine } from "lucide-react";
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { afford, type Category, hoursOfWork, type Item, money, parseSpending } from "@/lib/demo";

// A believable student week: $100 budget, $46 already spent, 4 days to go, $12/hr part-time job.
const BUDGET = 100;
const SPENT_BEFORE = 46;
const DAYS_LEFT = 4;
const HOURLY = 12;
const SCRIPT = "lunch 12, grab 8, bubble tea 6";

// What the "photo" in the Snap tab contains. Fixed sample: the landing page runs no AI.
const SAMPLE_RECEIPT: Item[] = [
  { label: "Iced coffee", amount: 3.2, category: "Treat" },
  { label: "Onigiri", amount: 2.8, category: "Food" },
  { label: "Bus card top-up", amount: 10, category: "Transport" },
];

const ASK_CHIPS = [
  { label: "Concert ticket", price: 40 },
  { label: "Bubble tea", price: 6 },
  { label: "Sneakers", price: 120 },
];

const CATEGORY_COLOR: Record<Category, string> = {
  Food: "bg-[#1f3fd8]/12 text-[#1f3fd8]",
  Transport: "bg-mint/25 text-[#155a44]",
  Treat: "bg-[#eeff5a] text-[#4a5000]",
  Groceries: "bg-mint/25 text-[#155a44]",
  Subscription: "bg-coral/20 text-[#b13a2c]",
  Other: "bg-black/5 text-receipt-ink/80",
};

const TABS = [
  { id: "type", label: "Type", icon: Keyboard },
  { id: "snap", label: "Snap", icon: Camera },
  { id: "ask", label: "Ask", icon: MessageCircleQuestion },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Line = Item & { id: number; batch: number };

export function HeroDemo() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>("type");
  const [lines, setLines] = useState<Line[]>([]);
  const [toast, setToast] = useState<{ batch: number; text: string } | null>(null);
  const [toastPaused, setToastPaused] = useState(false);
  const nextId = useRef(0);
  const scriptPending = useRef(true); // lives here so switching tabs doesn't replay the intro
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ type: null, snap: null, ask: null });

  const spentToday = lines.reduce((s, l) => s + l.amount, 0);
  const left = BUDGET - SPENT_BEFORE - spentToday;
  const safeToday = Math.max(0, left / DAYS_LEFT);

  // Every way of adding spending lands here, so the receipt, dial and Ask answers stay in sync.
  function addItems(items: Item[], toastText?: string) {
    const batch = nextId.current;
    const added = items.map((it) => ({ ...it, id: nextId.current++, batch }));
    setLines((prev) => [...prev, ...added]);
    setToast(toastText ? { batch, text: toastText } : null);
  }

  function undo() {
    if (!toast) return;
    setLines((prev) => prev.filter((l) => l.batch !== toast.batch));
    setToast(null);
    tabRefs.current[tab]?.focus();
  }

  useEffect(() => {
    if (!toast || toastPaused) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast, toastPaused]);

  // Tabs follow the WAI-ARIA pattern: arrow keys move between them, Home/End jump to the ends.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.findIndex((t) => t.id === tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-panel-line bg-panel-2 p-2 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.6)]">
        <div role="tablist" aria-label="Ways to add spending" className="grid grid-cols-3 gap-1 rounded-xl bg-panel p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              id={`demo-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={tab === id}
              aria-controls={`demo-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKey}
              className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === id ? "text-panel" : "text-on-panel-dim hover:text-on-panel"}`}
            >
              {tab === id && (
                <motion.span layoutId="demo-tab-pill" className="absolute inset-0 rounded-lg bg-hl" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <Icon size={15} aria-hidden="true" className="relative" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[7.25rem] px-1 pb-1 pt-3">
          {tab === "type" && <TypePanel reduced={reduced} scripted={scriptPending} onAdd={(items) => addItems(items, `Added ${items.length} ${items.length === 1 ? "item" : "items"}`)} onScriptDone={(items) => addItems(items)} />}
          {tab === "snap" && <SnapPanel reduced={reduced} onScanned={() => addItems(SAMPLE_RECEIPT, "Added 3 items from 7-Eleven")} />}
          {tab === "ask" && <AskPanel left={left} />}
        </div>
      </div>

      <div className="mt-5 drop-shadow-[0_22px_28px_rgb(0_0_0/0.35)] sm:rotate-[1.2deg]">
        <div className="receipt px-6 pb-8 pt-7 font-mono text-[13px]">
          <div className="flex justify-between uppercase tracking-wider text-receipt-ink/75">
            <span>Today</span>
            <span>Week 3 · day 4</span>
          </div>
          <div className="my-3 border-t border-dashed border-receipt-ink/25" />
          <ul className="min-h-[7.5rem]">
            <AnimatePresence initial={false}>
              {lines.slice(-6).map((l, i) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.28, delay: (i % 3) * 0.12 }}
                  className="flex items-center gap-2 py-1"
                >
                  <span className="truncate">{l.label}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-sans text-[10px] font-semibold ${CATEGORY_COLOR[l.category]}`}>
                    {l.category}
                  </span>
                  <span className="dotted-leader" />
                  <span className="tabular-nums">{money(l.amount)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {!lines.length && <li className="py-1 text-receipt-ink/75">Nothing logged yet today</li>}
          </ul>
          <div className="my-3 border-t border-dashed border-receipt-ink/25" />
          <div className="flex justify-between font-semibold">
            <span>Spent today</span>
            <span className="tabular-nums">{money(spentToday)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1.45fr_1fr]">
        <WeekDial left={left} safeToday={safeToday} />
        <div className="flex flex-col justify-between rounded-2xl bg-hl p-4 text-panel">
          <p className="text-sm font-medium">Rent in 6 days</p>
          <p className="font-display text-4xl">$650</p>
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Check size={14} aria-hidden="true" /> Already set aside
          </p>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-4 flex h-10 justify-center"
        onMouseEnter={() => setToastPaused(true)}
        onMouseLeave={() => setToastPaused(false)}
        onFocus={() => setToastPaused(true)}
        onBlur={() => setToastPaused(false)}
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 rounded-full bg-receipt px-4 py-2 text-sm text-receipt-ink shadow-lg"
            >
              <span>
                {toast.text}. Safe today: {money(Math.floor(safeToday * 100) / 100)}
              </span>
              <button
                type="button"
                onClick={undo}
                className="-my-2 inline-flex min-h-11 items-center px-2 font-semibold text-[#1f3fd8] underline-offset-2 hover:underline"
              >
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Panel({ id, children }: { id: Tab; children: ReactNode }) {
  return (
    <div id={`demo-panel-${id}`} role="tabpanel" aria-labelledby={`demo-tab-${id}`}>
      {children}
    </div>
  );
}

function TypePanel({
  reduced,
  scripted,
  onAdd,
  onScriptDone,
}: {
  reduced: boolean | null;
  scripted: RefObject<boolean>;
  onAdd: (items: Item[]) => void;
  onScriptDone: (items: Item[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function submit(value: string, fromScript = false) {
    const items = parseSpending(value);
    if (!items.length) {
      setError("Add an amount, like “lunch 12”.");
      return;
    }
    if (fromScript) onScriptDone(items);
    else onAdd(items);
    setText("");
    setError("");
  }

  // One orchestrated moment on load: the demo types a line and prints it, without a toast.
  useEffect(() => {
    if (!scripted.current) return;
    if (reduced) {
      scripted.current = false;
      submit(SCRIPT, true);
      return;
    }
    let i = 0;
    let timer = setTimeout(function tick() {
      if (!scripted.current) return;
      i++;
      setText(SCRIPT.slice(0, i));
      if (i < SCRIPT.length) timer = setTimeout(tick, 42);
      else timer = setTimeout(() => scripted.current && ((scripted.current = false), submit(SCRIPT, true)), 350);
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <Panel id="type">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          scripted.current = false;
          submit(text);
        }}
        className="flex items-center gap-2 rounded-xl bg-panel p-1.5 focus-within:ring-2 focus-within:ring-hl"
      >
        <label htmlFor="quick-add" className="sr-only">
          Type what you spent
        </label>
        <input
          id="quick-add"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "quick-add-error" : "quick-add-hint"}
          onChange={(e) => {
            scripted.current = false;
            setText(e.target.value);
          }}
          onFocus={() => {
            if (scripted.current) {
              scripted.current = false;
              setText("");
            }
          }}
          placeholder="kopi 4, netflix 15"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-on-panel placeholder:text-on-panel-dim/80 focus:outline-none focus-visible:shadow-none"
        />
        <button type="submit" className="flex min-h-11 items-center gap-1.5 rounded-lg bg-hl px-4 text-sm font-semibold text-panel">
          Add <CornerDownLeft size={14} aria-hidden="true" />
        </button>
      </form>
      {error ? (
        <p id="quick-add-error" role="alert" className="mt-2 px-1 text-sm text-hl">
          {error}
        </p>
      ) : (
        <p id="quick-add-hint" className="mt-2 px-1 text-sm text-on-panel-dim">
          Write it like a text. Commas split items, and Senbud picks the category.
        </p>
      )}
    </Panel>
  );
}

function SnapPanel({ reduced, onScanned }: { reduced: boolean | null; onScanned: () => void }) {
  const [state, setState] = useState<"idle" | "scanning" | "done">("idle");

  function scan() {
    if (state === "scanning") return;
    setState("scanning");
    setTimeout(
      () => {
        setState("done");
        onScanned();
      },
      reduced ? 0 : 1300,
    );
  }

  return (
    <Panel id="snap">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-24 shrink-0 -rotate-3 overflow-hidden rounded-md bg-receipt p-2 font-mono text-[7.5px] leading-[1.35] text-receipt-ink shadow-md" aria-hidden="true">
          <p className="text-center font-semibold">7-ELEVEN #2041</p>
          <div className="my-1 border-t border-dashed border-receipt-ink/30" />
          {SAMPLE_RECEIPT.map((it) => (
            <p key={it.label} className="flex justify-between gap-1">
              <span className="truncate">{it.label.toUpperCase()}</span>
              <span>{it.amount.toFixed(2)}</span>
            </p>
          ))}
          <div className="my-1 border-t border-dashed border-receipt-ink/30" />
          <p className="flex justify-between font-semibold">
            <span>TOTAL</span>
            <span>16.00</span>
          </p>
          {state === "scanning" && (
            <motion.span
              className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-hl/70 to-transparent"
              initial={{ top: "-20%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-on-panel-dim">
            {state === "done" ? "Read the shop, items and prices from the photo." : "Try it with a sample receipt from 7-Eleven."}
          </p>
          <button
            type="button"
            onClick={scan}
            aria-busy={state === "scanning"}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-hl px-4 text-sm font-semibold text-panel"
          >
            <ScanLine size={16} aria-hidden="true" />
            {state === "scanning" ? "Reading receipt…" : state === "done" ? "Scan it again" : "Scan sample receipt"}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function AskPanel({ left }: { left: number }) {
  const [price, setPrice] = useState("40");
  const value = Number(price);
  const result = value > 0 && value < 100_000 ? afford(value, { left, daysLeft: DAYS_LEFT, weeklyBudget: BUDGET }) : null;
  const answer = !result
    ? "Enter a price to check it against your week."
    : result.verdict === "no"
      ? `Not this week. You have ${money(Math.max(0, left))} left and rent is in 6 days.`
      : result.perDayAfter < 0.01
        ? "It would use everything left this week. Rent stays covered, but that’s it until Monday."
        : `${result.verdict === "yes" ? "Yes, go for it." : "Doable, but tight."} You’d have ${money(Math.floor(result.perDayAfter * 100) / 100)} a day left, and rent stays covered.`;

  return (
    <Panel id="ask">
      <div className="flex items-center gap-2 rounded-xl bg-panel p-1.5 pl-3 focus-within:ring-2 focus-within:ring-hl">
        <label htmlFor="ask-price" className="shrink-0 text-sm text-on-panel-dim">
          Can I afford $
        </label>
        <input
          id="ask-price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
          className="min-h-11 w-full min-w-0 bg-transparent font-display text-2xl tabular-nums text-on-panel focus:outline-none focus-visible:shadow-none"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ASK_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setPrice(String(c.price))}
            className="min-h-9 rounded-full border border-panel-line px-3 text-xs text-on-panel-dim hover:text-on-panel"
          >
            {c.label} ${c.price}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-2 px-1 text-sm text-on-panel">
        {answer}
        {result && <span className="text-on-panel-dim"> That’s {hoursOfWork(value, HOURLY)} hours of work.</span>}
      </p>
    </Panel>
  );
}

// The week as a ring: the yellow arc is what's left of the $100 budget.
function WeekDial({ left, safeToday }: { left: number; safeToday: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, left / BUDGET));
  const low = frac < 0.15;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-panel p-4 ring-1 ring-panel-line">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 108 108" className="size-28 -rotate-90" aria-hidden="true">
          <circle cx="54" cy="54" r={r} fill="none" stroke="rgb(255 255 255 / .14)" strokeWidth="10" />
          <motion.circle
            cx="54"
            cy="54"
            r={r}
            fill="none"
            stroke={low ? "var(--coral)" : "var(--hl)"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - frac) }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-on-panel-dim">Safe today</span>
          <span className="font-display text-2xl tabular-nums">{money(Math.floor(safeToday * 100) / 100)}</span>
        </div>
      </div>
      <div className="text-sm">
        <p className="font-semibold">{money(Math.max(0, left))} left</p>
        <p className="text-on-panel-dim">of {money(BUDGET)} this week</p>
        <p className="mt-2 text-on-panel-dim">{DAYS_LEFT} days to go</p>
      </div>
    </div>
  );
}
