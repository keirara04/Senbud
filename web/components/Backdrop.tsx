"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

// Ghost price tags that drift behind the hero. depth sets how far each one moves with the mouse.
const TAGS = [
  { text: "kopi $4", x: "6%", y: "16%", r: -8, depth: 18, mobile: true },
  { text: "grab $8", x: "40%", y: "8%", r: 6, depth: 10, mobile: false },
  { text: "rent $650", x: "88%", y: "6%", r: 5, depth: 24, mobile: true },
  { text: "bubble tea $6", x: "4%", y: "78%", r: 7, depth: 14, mobile: false },
  { text: "netflix $15", x: "46%", y: "88%", r: -6, depth: 20, mobile: true },
  { text: "lunch $12", x: "90%", y: "70%", r: -9, depth: 12, mobile: false },
];

function Tag({ tag, mx, my, i }: { tag: (typeof TAGS)[number]; mx: ReturnType<typeof useSpring>; my: ReturnType<typeof useSpring>; i: number }) {
  const x = useTransform(mx, (v) => v * tag.depth);
  const y = useTransform(my, (v) => v * tag.depth);
  return (
    <motion.span
      style={{ left: tag.x, top: tag.y, x, y, rotate: tag.r, animationDelay: `${-i * 1.7}s` }}
      className={`float-tag absolute whitespace-nowrap rounded-md bg-white/[0.07] px-3 py-1.5 font-mono text-[13px] text-white/30 ring-1 ring-white/10 ${tag.mobile ? "" : "hidden sm:block"}`}
    >
      {tag.text}
    </motion.span>
  );
}

// Decorative layer for the hero: grid paper, two slow glows and floating price tags.
export function HeroBackdrop() {
  const reduced = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 20 });
  const my = useSpring(rawY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    if (reduced || !matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      rawX.set(e.clientX / innerWidth - 0.5);
      rawY.set(e.clientY / innerHeight - 0.5);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, [reduced, rawX, rawY]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid-paper absolute inset-0" />
      <div className="glow-drift absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-white/15 blur-[120px]" />
      <div className="glow-drift-rev absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-hl/20 blur-[130px]" />
      {TAGS.map((t, i) => (
        <Tag key={t.text} tag={t} mx={mx} my={my} i={i} />
      ))}
    </div>
  );
}
