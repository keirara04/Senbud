"use client";

import { motion } from "motion/react";
import { Landmark, Lock } from "lucide-react";

// Three weeks of a typical manual-entry streak: keen in week one, fading by week three.
const STREAK = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 0],
];

export function BankAsk() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[17rem] rounded-2xl bg-paper p-4 shadow-[0_16px_30px_-18px_rgb(0_0_0/0.45)] ring-1 ring-line">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Landmark size={16} className="text-accent-ink" />
        Connect your bank
      </div>
      <p className="mt-1 text-xs text-ink-dim">Enter your online banking login to continue.</p>
      <div className="mt-3 space-y-2">
        <div className="rounded-lg bg-paper-2 px-3 py-2 text-xs text-ink-dim ring-1 ring-line">Username</div>
        <div className="flex items-center justify-between rounded-lg bg-paper-2 px-3 py-2 text-xs ring-1 ring-line">
          <span className="tracking-[0.3em]">••••••••</span>
          <Lock size={12} className="text-ink-dim" />
        </div>
      </div>
      <motion.div
        initial={{ rotate: 0 }}
        whileInView={{ rotate: [0, -4, 4, -3, 2, 0] }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-3 rounded-lg bg-panel py-2 text-center text-xs font-semibold text-on-panel"
      >
        Connect account
      </motion.div>
    </div>
  );
}

export function StreakFade() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[17rem] rounded-2xl bg-paper p-4 shadow-[0_16px_30px_-18px_rgb(0_0_0/0.45)] ring-1 ring-line">
      <p className="text-sm font-semibold">Days you logged spending</p>
      <div className="mt-3 space-y-2">
        {STREAK.map((week, w) => (
          <div key={w} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[11px] text-ink-dim">Week {w + 1}</span>
            <div className="grid flex-1 grid-cols-7 gap-1">
              {week.map((on, d) => (
                <motion.span
                  key={d}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ delay: (w * 7 + d) * 0.04 }}
                  className={`aspect-square rounded ${on ? "bg-accent-ink" : "bg-ink/10"}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-dim">Day 16: the app hasn’t been opened since.</p>
    </div>
  );
}
