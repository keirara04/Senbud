"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

// Phones only: once the hero has scrolled away, a slim bar slides up with the main call to action.
// It steps aside while the waitlist form itself is on screen.
export function MobileBar() {
  const [heroGone, setHeroGone] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const form = document.getElementById("waitlist");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setHeroGone(!e.isIntersecting);
        if (e.target === form) setFormVisible(e.isIntersecting);
      }
    });
    if (hero) io.observe(hero);
    if (form) io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {heroGone && !formVisible && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl bg-panel/95 p-2 pl-4 text-on-panel shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] ring-1 ring-panel-line backdrop-blur-md md:hidden"
        >
          <span className="text-sm">
            <span className="font-semibold">Senbud</span> <span className="text-on-panel-dim">· free, no account</span>
          </span>
          <a href="#waitlist" className="plausible-event-name=CTA plausible-event-place=mobile-bar hl-sweep inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl bg-hl px-4 text-sm font-semibold text-panel">
            Join the waitlist
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
