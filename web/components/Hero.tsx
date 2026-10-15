"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CornerDownLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Category, type Item, money, parseSpending } from "@/lib/demo";

// A believable student week: $100 budget, $46 already spent, 4 days to go.
const BUDGET = 100;
const SPENT_BEFORE = 46;
const DAYS_LEFT = 4;
const SCRIPT = "lunch 12, grab 8, bubble tea 6";

type Line = Item & { id: number; batch: number };

export const CATEGORY_COLOR: Record<Category, string> = {
  Food: "bg-[#1f3fd8]/12 text-[#1f3fd8]",
  Transport: "bg-mint/25 text-[#155a44]",
  Treat: "bg-[#eeff5a] text-[#4a5000]",
  Groceries: "bg-mint/25 text-[#155a44]",
  Subscription: "bg-coral/20 text-[#b13a2c]",
  Other: "bg-black/5 text-receipt-ink/70",
};

export function Hero() {
  const reduced = useReducedMotion();
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [toast, setToast] = useState<{ batch: number; count: number } | null>(null);
  const [error, setError] = useState("");
  const scripted = useRef(true);
  const nextId = useRef(0);

  const spentToday = lines.reduce((s, l) => s + l.amount, 0);
  const left = BUDGET - SPENT_BEFORE - spentToday;
  const safeToday = Math.max(0, left / DAYS_LEFT);
  const weekPct = Math.min(100, ((SPENT_BEFORE + spentToday) / BUDGET) * 100);

  function add(value: string) {
    const items = parseSpending(value);
    if (!items.length) {
      setError("Add an amount, like “lunch 12”.");
      return;
    }
    const batch = nextId.current;
    setLines((prev) => [...prev, ...items.map((it) => ({ ...it, id: nextId.current++, batch }))].slice(-6));
    setToast({ batch, count: items.length });
    setText("");
    setError("");
  }

  function undo() {
    if (!toast) return;
    setLines((prev) => prev.filter((l) => l.batch !== toast.batch));
    setToast(null);
  }

  // One orchestrated moment: the demo types and prints a line on load.
  useEffect(() => {
    if (reduced) {
      add(SCRIPT);
      scripted.current = false;
      return;
    }
    let i = 0;
    let timer = setTimeout(function tick() {
      if (!scripted.current) return;
      i++;
      setText(SCRIPT.slice(0, i));
      if (i < SCRIPT.length) timer = setTimeout(tick, 42);
      else timer = setTimeout(() => scripted.current && (add(SCRIPT), (scripted.current = false)), 350);
    }, 700);
    return () => clearTimeout(timer);
  }, [reduced]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section id="top" className="relative overflow-hidden bg-panel text-on-panel">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-white/15 blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 min-[900px]:grid-cols-[1.05fr_1fr] min-[900px]:items-center min-[900px]:pb-28 min-[900px]:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] leading-[1.02]">
            Your money buddy that does the <em className="text-hl">boring part.</em>
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-on-panel-dim">
            Snap a receipt or type “lunch 12, grab 8”. Senbud logs it, counts down to rent, and tells you when you
            can actually afford that burger.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#waitlist"
              className="rounded-full bg-hl px-6 py-3.5 text-center font-semibold text-panel transition-transform hover:-translate-y-0.5"
            >
              Get early access
            </a>
            <a
              href="#how"
              className="rounded-full border border-panel-line px-6 py-3.5 text-center font-semibold text-on-panel transition-colors hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-panel-dim">
            {["No bank password", "No sign-up to try", "Free plan forever"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check size={16} className="text-hl" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              scripted.current = false;
              add(text);
            }}
            className="flex items-center gap-2 rounded-2xl border border-panel-line bg-panel-2 p-2 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.6)]"
          >
            <label htmlFor="quick-add" className="sr-only">
              Type what you spent
            </label>
            <input
              id="quick-add"
              value={text}
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
              placeholder="Try: kopi 4, netflix 15"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base text-on-panel placeholder:text-on-panel-dim/60 focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-hl px-4 py-2.5 text-sm font-semibold text-panel"
            >
              Add <CornerDownLeft size={14} aria-hidden="true" />
            </button>
          </form>
          {error && <p className="mt-2 px-2 text-sm text-hl">{error}</p>}

          <div className="receipt mt-5 px-6 pb-8 pt-7 font-mono text-[13px] shadow-[0_30px_60px_-25px_rgb(0_0_0/0.7)] sm:rotate-[1.2deg]">
            <div className="flex justify-between uppercase tracking-wider text-receipt-ink/75">
              <span>Today</span>
              <span>Week 3 · day 4</span>
            </div>
            <div className="my-3 border-t border-dashed border-receipt-ink/25" />
            <ul className="min-h-[7.5rem]">
              <AnimatePresence initial={false}>
                {lines.map((l, i) => (
                  <motion.li
                    key={l.id}
                    layout
                    initial={reduced ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.28, delay: reduced ? 0 : (i % 3) * 0.12 }}
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

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-2xl bg-panel-2 p-4 sm:col-span-1">
              <p className="text-sm text-on-panel-dim">Safe to spend today</p>
              <motion.p
                key={safeToday.toFixed(2)}
                initial={reduced ? false : { opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl tabular-nums"
              >
                {money(Math.floor(safeToday * 100) / 100)}
              </motion.p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <motion.div
                  className={`h-full rounded-full ${weekPct > 85 ? "bg-coral" : "bg-hl"}`}
                  animate={{ width: `${weekPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-on-panel-dim">
                {money(SPENT_BEFORE + spentToday)} of {money(BUDGET)} this week
              </p>
            </div>
            <div className="col-span-2 flex flex-col justify-between rounded-2xl bg-hl p-4 text-panel sm:col-span-1">
              <p className="text-sm font-medium">Rent in 6 days</p>
              <p className="font-display text-4xl">$650</p>
              <p className="flex items-center gap-1.5 text-xs font-medium">
                <Check size={14} aria-hidden="true" /> Already set aside
              </p>
            </div>
          </div>

          <div aria-live="polite" className="mt-4 flex h-10 justify-center">
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-3 rounded-full bg-receipt px-4 py-2 text-sm text-receipt-ink shadow-lg"
                >
                  <span>
                    Added {toast.count} {toast.count === 1 ? "item" : "items"}. Safe to spend today:{" "}
                    {money(Math.floor(safeToday * 100) / 100)}
                  </span>
                  <button type="button" onClick={undo} className="-my-2 inline-flex min-h-11 items-center px-2 font-semibold text-[#1f3fd8] underline-offset-2 hover:underline">
                    Undo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
