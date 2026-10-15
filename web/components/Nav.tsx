"use client";

import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY, scrollYProgress } = useScroll();
  // The page-progress line is a highlighter stroke drawn along the bottom of the bar.
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => setCondensed(y > 24));

  // The link for whichever section sits in the middle of the screen gets the highlighter.
  useEffect(() => {
    // Every section is watched, so the marker clears over sections that have no link of their own.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id ? `#${e.target.id}` : null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll("main > section").forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b text-on-panel backdrop-blur-md transition-[background-color,border-color] duration-300 ${condensed ? "border-panel-line bg-panel/95" : "border-transparent bg-panel/70"}`}
    >
      <nav
        aria-label="Main"
        className={`flex w-full items-center justify-between px-4 transition-[height] duration-300 sm:px-6 lg:px-10 ${condensed ? "h-14" : "h-16"}`}
      >
        <a href="#top" aria-label="Senbud home" className="inline-flex min-h-11 items-center">
          <Logo />
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active === l.href ? "true" : undefined}
                  className={`relative inline-flex min-h-11 items-center px-3 text-sm transition-colors ${active === l.href ? "text-on-panel" : "text-on-panel-dim hover:text-on-panel"}`}
                >
                  {active === l.href && (
                    <motion.span
                      layoutId="nav-marker"
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-2 h-1.5 -skew-x-12 rounded-sm bg-hl/80"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href="#waitlist" className="hl-sweep inline-flex min-h-11 items-center rounded-full bg-hl px-4 text-sm font-semibold text-panel">
            Get early access
          </a>
        </div>
      </nav>
      <motion.div aria-hidden="true" style={{ scaleX: progress }} className="absolute inset-x-0 -bottom-px h-[3px] origin-left bg-hl" />
    </header>
  );
}
