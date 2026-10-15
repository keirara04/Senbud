"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Smartphone, Sparkles } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { h2, wrap } from "./Sections";

// One everyday moment, step by step: where does a snapped receipt actually go?
const STEPS = [
  {
    tab: "Snap",
    title: "You snap your lunch receipt.",
    body: "The photo is saved on your phone. Nothing has left it yet.",
    where: "phone",
    token: "Receipt photo",
  },
  {
    tab: "Read",
    title: "The AI reads the shop and the price.",
    body: "Only this one photo is sent, and only if you’ve turned AI on. The AI answers and keeps nothing.",
    where: "ai",
    token: "Reading…",
  },
  {
    tab: "Saved",
    title: "It lands on your receipt, back on your phone.",
    body: "“Mamak · $8.40” is saved where everything else is. Senbud’s servers never saw it.",
    where: "phone",
    token: "Mamak · $8.40",
  },
] as const;

function Token({ label, step }: { label: string; step: number }) {
  return (
    <motion.span
      layoutId="privacy-token"
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[13px] shadow-md ${step === 1 ? "bg-hl text-[#1f3fd8]" : "bg-receipt text-receipt-ink"}`}
    >
      {label}
    </motion.span>
  );
}

function Place({ icon, name, active, children }: { icon: ReactNode; name: string; active: boolean; children?: ReactNode }) {
  return (
    <div
      className={`flex min-h-44 flex-1 flex-col items-center gap-4 rounded-3xl p-5 text-center transition-colors ${active ? "bg-panel-2 ring-2 ring-hl" : "bg-panel-2/60 ring-1 ring-panel-line"}`}
    >
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {name}
      </div>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

export function Privacy() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const seen = useInView(stage, { once: true, amount: 0.3 });
  const s = STEPS[step];

  // Plays through once when scrolled into view; any click hands control to the visitor.
  useEffect(() => {
    if (!seen || !auto || reduced || step === STEPS.length - 1) return;
    const t = setTimeout(() => setStep((n) => n + 1), 3200);
    return () => clearTimeout(t);
  }, [seen, auto, reduced, step]);

  const go = (n: number) => {
    setAuto(false);
    setStep(n);
  };

  return (
    <section className="bg-panel text-on-panel">
      <div className={`${wrap} py-20 sm:py-28`}>
        <h2 className={`${h2} max-w-3xl`}>Here’s exactly where your <span className="marker marker-soft">money data goes.</span></h2>
        <p className="mt-5 max-w-xl text-lg text-on-panel-dim">Follow one receipt from your hand to your budget.</p>

        <div ref={stage} className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex items-stretch gap-1 sm:gap-3">
              <Place icon={<Smartphone size={20} className="text-hl" aria-hidden="true" />} name="Your phone" active={s.where === "phone"}>
                {s.where === "phone" && <Token label={s.token} step={step} />}
              </Place>
              {/* Direction of travel: out to the AI on step 2, back home on step 3. */}
              <div className="flex w-6 shrink-0 items-center justify-center text-hl" aria-hidden="true">
                {step === 1 && <ArrowRight size={22} />}
                {step === 2 && <ArrowLeft size={22} />}
              </div>
              <Place icon={<Sparkles size={20} className="text-hl" aria-hidden="true" />} name="AI model" active={s.where === "ai"}>
                {s.where === "ai" && <Token label={s.token} step={step} />}
              </Place>
            </div>
            <p className="mt-4 text-center text-sm text-on-panel-dim">Senbud’s servers: never in the picture.</p>
          </div>

          <div>
            <ol className="flex gap-2" aria-label="Steps">
              {STEPS.map((st, n) => (
                <li key={st.tab}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    aria-current={n === step ? "step" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${n === step ? "bg-hl text-panel" : "text-on-panel-dim ring-1 ring-panel-line hover:text-on-panel"}`}
                  >
                    <span className="tabular-nums">{n + 1}</span>
                    {st.tab}
                  </button>
                </li>
              ))}
            </ol>
            <div aria-live="polite" className="mt-6 min-h-36">
              <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold leading-snug">
                {s.title}
              </motion.p>
              <p className="mt-3 text-lg text-on-panel-dim">{s.body}</p>
            </div>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="mt-2 inline-flex min-h-11 items-center rounded-full bg-hl px-5 text-sm font-semibold text-panel"
              >
                Next step
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(0)}
                className="mt-2 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ring-1 ring-panel-line hover:bg-white/5"
              >
                Play again
              </button>
            )}
          </div>
        </div>

        <p className="mt-14 max-w-2xl border-t border-panel-line pt-6 text-on-panel-dim">
          Senbud never asks for your bank login or card numbers, never shows ads, and never sells your data. Your
          data lives in your browser, so clearing your browser data deletes it. Senbud reminds you to export a backup.
        </p>
      </div>
    </section>
  );
}
