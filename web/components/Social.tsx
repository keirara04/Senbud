"use client";

import { motion } from "motion/react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { type BillItem, money, type Owner, splitBill } from "@/lib/demo";
import { h2, wrap } from "./Sections";

const BILL: BillItem[] = [
  { label: "Cheeseburger", cents: 1200, owner: "You" },
  { label: "Chicken tacos", cents: 1000, owner: "Jordan" },
  { label: "Fries x2", cents: 400, owner: "Sarah" },
  { label: "Iced coffee", cents: 450, owner: "Sarah" },
  { label: "Sodas x3", cents: 900, owner: "Shared" },
  { label: "Chips and salsa", cents: 250, owner: "Shared" },
];
const TOTAL = BILL.reduce((s, i) => s + i.cents, 0);
const OWNERS: Owner[] = ["You", "Jordan", "Sarah", "Shared"];

// Each person keeps one solid colour everywhere (solid so it reads on both light and dark pages).
const OWNER_STYLE: Record<Owner, string> = {
  You: "bg-[#eeff5a] text-[#4a5000]",
  Jordan: "bg-[#c4efdd] text-[#155a44]",
  Sarah: "bg-[#ffd6cf] text-[#9e2f22]",
  Shared: "bg-[#e1e7fb] text-[#1f3fd8]",
};

const usd = (cents: number) => money(cents / 100);

export function Split() {
  const [mode, setMode] = useState<"even" | "items">("even");
  const [bill, setBill] = useState(BILL);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const shares = splitBill(bill, mode);
  const reminder = `Hey Sarah! Friday dinner at the diner: your share is ${usd(shares.Sarah)} 😊`;

  useEffect(() => {
    if (copyState === "idle") return;
    const t = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(t);
  }, [copyState]);

  async function copy() {
    try {
      // Clipboard is only available on https (or localhost); fail visibly anywhere else.
      await navigator.clipboard.writeText(reminder);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  // Tapping a line passes it to the next person: You -> Jordan -> Sarah -> Shared -> You.
  function cycle(i: number) {
    setMode("items");
    setBill((prev) => prev.map((it, n) => (n === i ? { ...it, owner: OWNERS[(OWNERS.indexOf(it.owner) + 1) % OWNERS.length] } : it)));
  }

  return (
    <section>
      <div className={`${wrap} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2`}>
        <div>
          <h2 className={h2}>Split the bill without the <span className="marker">awkward group chat.</span></h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Snap the receipt and say who was there. Split it evenly, or tap each line to say who had what. Your share
            counts as your spending; the rest is kept as IOUs until friends pay you back.
          </p>
          <p className="mt-4 max-w-md text-ink-dim">Friends are just names. Senbud never asks for their numbers or contacts.</p>
        </div>

        <div className="rounded-3xl bg-paper-2 p-4 ring-1 ring-line sm:p-6">
          <fieldset className="flex rounded-full bg-paper p-1 ring-1 ring-line">
            <legend className="sr-only">How to split</legend>
            {(
              [
                ["even", "Split evenly"],
                ["items", "By item"],
              ] as const
            ).map(([v, label]) => (
              <label
                key={v}
                className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl ${mode === v ? "bg-panel text-on-panel" : "text-ink-dim hover:text-ink"}`}
              >
                <input type="radio" name="split-mode" className="sr-only" checked={mode === v} onChange={() => setMode(v)} />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="mt-4 drop-shadow-[0_12px_16px_rgb(0_0_0/0.18)]">
            <div className="receipt px-4 pb-6 pt-5 font-mono text-[13px] sm:px-5">
              <div className="flex justify-between uppercase tracking-wider text-receipt-ink/75">
                <span>Fri · Corner Diner</span>
                <span>Paid by you</span>
              </div>
              <div className="my-3 border-t border-dashed border-receipt-ink/25" />
              <ul>
                {bill.map((it, i) => (
                  <li key={it.label}>
                    <button
                      type="button"
                      onClick={() => cycle(i)}
                      aria-label={`${it.label}, ${usd(it.cents)}, ${mode === "even" ? "shared evenly" : it.owner === "Shared" ? "shared" : `had by ${it.owner}`}. Change who had it`}
                      className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 text-left hover:bg-black/[0.04]"
                    >
                      <span className="truncate">{it.label}</span>
                      <span className="dotted-leader" />
                      <span className="tabular-nums">{usd(it.cents)}</span>
                      <span
                        className={`w-16 shrink-0 rounded px-1.5 py-0.5 text-center font-sans text-[11px] font-semibold ${mode === "even" ? OWNER_STYLE.Shared : OWNER_STYLE[it.owner]}`}
                      >
                        {mode === "even" ? "Even" : it.owner}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="my-3 border-t border-dashed border-receipt-ink/25" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{usd(TOTAL)}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-ink-dim">Tap a line to change who had it.</p>

          <ul aria-live="polite" className="mt-4 grid grid-cols-3 gap-2">
            {(["You", "Jordan", "Sarah"] as const).map((p) => (
              <li key={p} className={`rounded-2xl p-3 ${OWNER_STYLE[p]}`}>
                <p className="text-xs font-semibold">{p === "You" ? "Your share" : `${p} owes you`}</p>
                <motion.p key={`${p}-${shares[p]}`} initial={{ opacity: 0.4, y: 3 }} animate={{ opacity: 1, y: 0 }} className="font-display text-xl tabular-nums sm:text-2xl">
                  {usd(shares[p])}
                </motion.p>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
            <p className="text-sm text-ink-dim">Reminder for Sarah, ready to paste</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="min-w-0">{reminder}</p>
              <button
                type="button"
                onClick={copy}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-panel px-4 text-sm font-semibold text-on-panel"
              >
                {copyState === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                <span aria-live="polite">{{ idle: "Copy", copied: "Copied", failed: "Copy failed" }[copyState]}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const cards = [
  { bg: "bg-hl text-panel", top: "Your most visited spot", big: "7-Eleven", foot: "31 visits. It’s basically your kitchen." },
  { bg: "bg-coral text-[#3a0f09]", top: "Treats this month", big: "14 bubble teas", foot: "Every single one was in budget." },
  { bg: "bg-panel text-on-panel", top: "Hours of work you spent", big: "38 hrs", foot: "Rent took 22 of them." },
];

export function Wrapped() {
  const [i, setI] = useState(0);
  const next = () => setI((i + 1) % cards.length);
  return (
    <section>
      <div className={`${wrap} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr]`}>
        <div>
          <h2 className={h2}>Your month, <span className="marker">wrapped.</span></h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            On the 1st, Senbud turns last month into a short story worth sharing. Share cards hide your amounts
            unless you choose to show them.
          </p>
        </div>
        <div className="lg:order-first">
          {/* The stack is a picture; the button below is the control. Clicking a card also flips it. */}
          <div
            className="relative mx-auto h-[26rem] w-full max-w-[18rem] cursor-pointer sm:max-w-[20rem]"
            onClick={next}
          >
            {cards.map((c, n) => {
              const pos = (n - i + cards.length) % cards.length;
              return (
                <motion.div
                  key={c.big}
                  aria-hidden={pos !== 0}
                  initial={false}
                  animate={{ rotate: pos * 5 - 2, x: pos * 12, y: pos * 10, zIndex: cards.length - pos, scale: 1 - pos * 0.04 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className={`absolute inset-0 flex flex-col justify-between rounded-[2rem] p-7 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] ${c.bg}`}
                >
                  <span className="text-sm font-medium opacity-80">{c.top}</span>
                  <span className="font-display text-5xl leading-none">{c.big}</span>
                  <span className="text-lg">{c.foot}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-dim ring-1 ring-line hover:text-ink"
            >
              Next card <span className="tabular-nums">({i + 1} of {cards.length})</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
