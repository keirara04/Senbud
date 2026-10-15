"use client";

import { ArrowRight } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
// Same layout strings as Sections.tsx; copied so this client file doesn't pull that module into the bundle.
const wrap = "mx-auto max-w-6xl px-4 sm:px-6";
const h2 = "font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06]";

// "Three ways to add spending": custom brand icons, an effort meter, and a short demo per way
// that plays once when the card scrolls into view (static for reduced motion).

// ---------- custom icons (24×24, white on cobalt with a highlighter accent) ----------

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function SnapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path {...stroke} d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <path {...stroke} d="M8 6h8v12l-2-1.2-2 1.2-2-1.2-2 1.2z" />
      <path d="M4.5 12h15" stroke="var(--hl)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path {...stroke} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4a2 2 0 0 1-2-2z" />
      <path d="M8 8.5h8" stroke="var(--hl)" strokeWidth="2.4" strokeLinecap="round" />
      <path {...stroke} d="M8 12h5" />
    </svg>
  );
}

function TapIcon() {
  const dots = [6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => [x, y] as const));
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      {dots.map(([x, y]) =>
        x === 12 && y === 12 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />,
      )}
      <circle cx="12" cy="12" r="3.2" fill="var(--hl)" />
    </svg>
  );
}

// ---------- shared bits ----------

function ReceiptLine({ label, cat, amount }: { label: string; cat: string; amount: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md bg-receipt px-2.5 py-1.5 font-mono text-[12px] text-receipt-ink shadow-sm ring-1 ring-black/5">
      <span>{label}</span>
      <span className="rounded bg-[#1f3fd8]/10 px-1 font-sans text-[10px] font-semibold text-[#1f3fd8]">{cat}</span>
      <span className="ml-auto tabular-nums">{amount}</span>
    </span>
  );
}

/** Pops a receipt line in once `show` turns true. */
function Landed({ show, children, delay = 0 }: { show: boolean; children: ReactNode; delay?: number }) {
  return (
    <motion.span
      className="block"
      initial={false}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 0.68, 0.14, 1] }}
    >
      {children}
    </motion.span>
  );
}

function Effort({ level, label }: { level: 1 | 2 | 3; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-dim">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-3.5 w-2 rounded-full ${i <= level ? "bg-accent-ink" : "bg-ink/15"}`} />
        ))}
      </span>
      {label}
    </span>
  );
}

/** Plays once when in view; `step` counts up on a schedule. Reduced motion jumps to the end. */
function useScript(steps: number[], ref: React.RefObject<Element | null>) {
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      const t = setTimeout(() => setStep(steps.length), 0);
      return () => clearTimeout(t);
    }
    const timers = steps.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, steps]);
  return step;
}

// ---------- the three demos ----------

const SNAP_STEPS = [1300];
function SnapDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScript(SNAP_STEPS, ref);
  const reduce = useReducedMotion();
  return (
    <Demo ref={ref}>
      <span className="relative h-24 w-[4.5rem] shrink-0 -rotate-6 overflow-hidden rounded-md bg-receipt p-2 shadow-md ring-1 ring-black/5">
        <span className="mb-1 block font-mono text-[7px] font-bold text-receipt-ink">CORNER DELI</span>
        {[80, 60, 70, 45].map((w, i) => (
          <span key={i} className="mb-1.5 block h-1 rounded bg-receipt-ink/25" style={{ width: `${w}%` }} />
        ))}
        <span className="mt-2 block h-1.5 w-1/2 rounded bg-receipt-ink/60" />
        {/* Viewfinder corners */}
        <span className="absolute inset-1 rounded border-2 border-dashed border-[#1f3fd8]/30" />
        {/* Highlighter scan line sweeps once */}
        <motion.span
          className="absolute inset-x-0 h-2.5 bg-hl/85 mix-blend-multiply"
          initial={{ top: "8%" }}
          animate={step >= 1 || reduce ? { top: "62%" } : { top: ["8%", "82%", "8%", "62%"] }}
          transition={{ duration: 1.3, ease: "easeInOut" }}
        />
      </span>
      <Arrow />
      <span className="min-w-0 flex-1">
        <Landed show={step >= 1}>
          <ReceiptLine label="Corner Deli" cat="Food" amount="$8.40" />
        </Landed>
      </span>
    </Demo>
  );
}

const TYPE_TEXT = "lunch 12, uber 8";
const TYPE_STEPS = Array.from({ length: TYPE_TEXT.length }, (_, i) => 250 + i * 55).concat(250 + TYPE_TEXT.length * 55 + 250);
function TypeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScript(TYPE_STEPS, ref);
  const typed = TYPE_TEXT.slice(0, Math.min(step, TYPE_TEXT.length));
  const sent = step > TYPE_TEXT.length;
  return (
    <Demo ref={ref}>
      <span className="relative shrink-0 rounded-2xl rounded-br-md bg-panel px-3 py-2 font-mono text-sm text-on-panel">
        {/* Reserve the full width so the bubble doesn't grow while typing. */}
        <span className="invisible">{TYPE_TEXT}</span>
        <span className="absolute inset-0 px-3 py-2">
          {typed}
          {!sent && <span className="ml-px inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-hl" />}
        </span>
      </span>
      <Arrow />
      <span className="grid min-w-0 flex-1 gap-1.5">
        <Landed show={sent}>
          <ReceiptLine label="Lunch" cat="Food" amount="$12" />
        </Landed>
        <Landed show={sent} delay={0.12}>
          <ReceiptLine label="Uber" cat="Transport" amount="$8" />
        </Landed>
      </span>
    </Demo>
  );
}

const TAP_STEPS = [400, 750, 1150, 1500];
function TapDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScript(TAP_STEPS, ref);
  const amount = step === 0 ? "$0" : step === 1 ? "$1" : "$12";
  return (
    <Demo ref={ref}>
      <span className="shrink-0">
        <span className="block font-display text-2xl tabular-nums">{amount}</span>
        <span className="mt-1 flex gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              step >= 3 ? "bg-hl text-[#1f3fd8]" : "text-ink-dim ring-1 ring-line"
            }`}
          >
            Food
          </span>
          <span className="rounded-full px-2 py-0.5 text-[11px] text-ink-dim ring-1 ring-line">Bills</span>
        </span>
      </span>
      <Arrow />
      <span className="min-w-0 flex-1">
        <Landed show={step >= 4}>
          <ReceiptLine label="Lunch" cat="Food" amount="$12" />
        </Landed>
      </span>
    </Demo>
  );
}

// Points down on phones (demo stacks), right from sm up.
const Arrow = () => <ArrowRight size={18} className="shrink-0 rotate-90 self-center text-ink-dim sm:rotate-0" aria-hidden="true" />;

function Demo({ children, ref }: { children: ReactNode; ref: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="mt-5 flex min-h-28 flex-col items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line sm:flex-row sm:gap-4 [&>span:last-child]:w-full [&>span:last-child]:sm:w-auto"
    >
      {children}
    </div>
  );
}

// ---------- section ----------

const ways = [
  {
    icon: <SnapIcon />,
    title: "Snap it",
    body: "Take a photo of a receipt or a screenshot of your banking app. Senbud reads the shop, amount and date.",
    effort: { level: 1, label: "1 photo" } as const,
    sticker: "Laziest",
    demo: <SnapDemo />,
  },
  {
    icon: <TypeIcon />,
    title: "Type it like a text",
    body: "Write the way you’d tell a friend. One line can hold a whole day.",
    effort: { level: 2, label: "1 line" } as const,
    demo: <TypeDemo />,
  },
  {
    icon: <TapIcon />,
    title: "Or tap it in yourself",
    body: "Amount first, then a category. Two taps, no AI involved, and it works offline.",
    effort: { level: 3, label: "2 taps · works offline" } as const,
    demo: <TapDemo />,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 overflow-x-clip">
      <div className={`${wrap} grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className={h2}>
            Three ways to add spending. <span className="marker">Pick the lazy one.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Every entry lands in the same place, so your budget, rent and treats stay up to date whichever way you
            use.
          </p>
        </div>
        <ul className="relative isolate grid gap-4">
          <li aria-hidden="true" className="paper-glow hl -right-16 top-1/3 h-72 w-72 list-none" />
          <li aria-hidden="true" className="paper-glow cobalt -left-10 bottom-10 h-64 w-64 list-none" />
          {ways.map((w) => (
            <li key={w.title} className="relative rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-7">
              {w.sticker && (
                <span className="absolute -right-2 -top-3 rotate-6 rounded-lg bg-hl px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#1f3fd8] shadow-md">
                  {w.sticker} 😴
                </span>
              )}
              <div className="flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-panel text-on-panel shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)]">
                  {w.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold">{w.title}</h3>
                  <p className="mt-1.5 text-ink-dim">{w.body}</p>
                  <p className="mt-3">
                    <span className="sr-only">Effort: </span>
                    <Effort level={w.effort.level} label={w.effort.label} />
                  </p>
                </div>
              </div>
              {w.demo}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
