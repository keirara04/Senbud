"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { h2, wrap } from "./Sections";

const shares = [
  { name: "You", note: "paid", amount: "$14", owes: false },
  { name: "Aiman", note: "owes you", amount: "$14", owes: true },
  { name: "Sarah", note: "owes you", amount: "$14", owes: true },
];

const REMINDER = "Hey Sarah! Friday dinner came to $14 each 😊";

export function Split() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(REMINDER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="border-t border-line">
      <div className={`${wrap} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2`}>
        <div>
          <h2 className={h2}>Split the bill without the awkward group chat.</h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Snap the receipt and say who was there. Your share counts as your spending. What friends owe you is kept
            as an IOU until they pay you back.
          </p>
          <p className="mt-4 max-w-md text-ink-dim">Friends are just names. Ledgerly never asks for their numbers or contacts.</p>
        </div>

        <div>
          <div className="flex gap-2">
            {shares.map((s, i) => (
              <div
                key={s.name}
                style={{ rotate: `${(i - 1) * 2.5}deg` }}
                className="receipt flex-1 px-3 pb-6 pt-5 font-mono text-[13px] shadow-[0_20px_40px_-24px_rgb(0_0_0/0.5)] sm:px-4"
              >
                <p className="uppercase tracking-wider text-receipt-ink/60">Fri dinner</p>
                <div className="my-3 border-t border-dashed border-receipt-ink/25" />
                <p className="font-sans text-base font-semibold">{s.name}</p>
                <p className={s.owes ? "text-[#b13a2c]" : "text-[#1f7a5c]"}>{s.note}</p>
                <p className="mt-4 text-xl font-semibold">{s.amount}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-paper-2 p-4 ring-1 ring-line">
            <p className="text-sm text-ink-dim">Reminder for Sarah, ready to paste</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="min-w-0">{REMINDER}</p>
              <button
                type="button"
                onClick={copy}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-lilac px-4 text-sm font-semibold text-plum"
              >
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const cards = [
  { bg: "bg-lilac text-plum", top: "Your most visited spot", big: "7-Eleven", foot: "31 visits. It’s basically your kitchen." },
  { bg: "bg-mango text-plum", top: "Treats this month", big: "14 bubble teas", foot: "Every single one was in budget." },
  { bg: "bg-plum text-on-plum", top: "Hours of work you spent", big: "38 hrs", foot: "Rent took 22 of them." },
];

export function Wrapped() {
  const [i, setI] = useState(0);
  return (
    <section className="border-t border-line">
      <div className={`${wrap} grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.1fr]`}>
        <div className="order-2 lg:order-1">
          <div className="relative mx-auto h-[26rem] w-full max-w-[20rem]">
            <AnimatePresence initial={false}>
              {cards.map((c, n) => {
                const pos = (n - i + cards.length) % cards.length;
                return (
                  <motion.button
                    type="button"
                    key={c.big}
                    onClick={() => setI((i + 1) % cards.length)}
                    aria-label={`Recap card ${n + 1} of ${cards.length}: ${c.top}, ${c.big}. Show next card`}
                    animate={{ rotate: pos * 5 - 2, x: pos * 18, y: pos * 10, zIndex: cards.length - pos, scale: 1 - pos * 0.04 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className={`absolute inset-0 flex flex-col justify-between rounded-[2rem] p-7 text-left shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] ${c.bg}`}
                  >
                    <span className="text-sm font-medium opacity-80">{c.top}</span>
                    <span className="font-display text-5xl leading-none">{c.big}</span>
                    <span className="text-lg">{c.foot}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
          <p className="mt-6 text-center text-sm text-ink-dim">Tap the card to flip through</p>
        </div>
        <div className="order-1 lg:order-2">
          <h2 className={h2}>Your month, wrapped.</h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            On the 1st, Ledgerly turns last month into a short story worth sharing. Share cards hide your amounts
            unless you choose to show them.
          </p>
        </div>
      </div>
    </section>
  );
}
