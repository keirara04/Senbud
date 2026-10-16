"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

// Links point at "/#section" so they also work from the comparison pages.
const links = [
  { id: "how", label: "How it works" },
  { id: "meet-bud", label: "Bud" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export function Nav() {
  const { scrollY, scrollYProgress } = useScroll();
  // The page-progress line is a highlighter stroke drawn along the bottom of the bar.
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setCondensed(y > 24));

  // The link for whichever section sits in the middle of the screen gets a soft pill behind it.
  useEffect(() => {
    // Every section is watched, so the pill clears over sections that have no link of their own.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id || null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll("main > section").forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  // The phone menu closes with Escape, like any other popup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b text-on-panel backdrop-blur-md transition-[background-color,border-color] duration-300 ${condensed || open ? "border-panel-line bg-panel/95" : "border-transparent bg-panel/70"}`}
    >
      <nav
        aria-label="Main"
        className={`flex w-full items-center justify-between px-4 transition-[height] duration-300 sm:px-6 lg:px-10 ${condensed ? "h-14" : "h-16"}`}
      >
        <Link href="/" aria-label="Senbud home" className="inline-flex min-h-11 items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/#${l.id}`}
                  aria-current={active === l.id ? "true" : undefined}
                  className={`relative inline-flex min-h-11 items-center px-3 text-sm transition-colors ${active === l.id ? "text-on-panel" : "text-on-panel-dim hover:text-on-panel"}`}
                >
                  {active === l.id && (
                    <motion.span
                      layoutId="nav-marker"
                      aria-hidden="true"
                      className="absolute inset-x-0 inset-y-1.5 rounded-full bg-white/15"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://app.senbud.com"
                className="plausible-event-name=Web+app plausible-event-place=nav inline-flex min-h-11 items-center px-3 text-sm text-on-panel-dim transition-colors hover:text-on-panel"
              >
                Try it in your browser
              </a>
            </li>
          </ul>
          <Link href="/#waitlist" className="plausible-event-name=CTA plausible-event-place=nav hl-sweep inline-flex min-h-11 items-center rounded-full bg-hl px-4 text-sm font-semibold text-panel">
            Join the waitlist
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-full text-on-panel hover:bg-white/10 md:hidden"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.68, 0.14, 1] }}
            className="overflow-hidden border-t border-panel-line md:hidden"
          >
            <ul className="px-4 py-3">
              {links.map((l, i) => (
                <motion.li key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                  <Link
                    href={`/#${l.id}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center rounded-xl px-3 text-lg font-semibold hover:bg-white/10"
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + links.length * 0.05 }}>
                <a
                  href="https://app.senbud.com"
                  className="plausible-event-name=Web+app plausible-event-place=nav flex min-h-12 items-center rounded-xl px-3 text-lg font-semibold hover:bg-white/10"
                >
                  Try it in your browser
                </a>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div aria-hidden="true" style={{ scaleX: progress }} className="absolute inset-x-0 -bottom-px h-[3px] origin-left bg-hl" />
    </header>
  );
}
