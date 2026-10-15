"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

// Smooth momentum scrolling for mouse wheels and trackpads. It evens out jumpy wheel steps but still
// follows how fast you scroll. Touch screens keep native scrolling, and Lenis turns its smoothing off
// for anyone with reduced motion set.
export function SmoothScroll() {
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, autoRaf: true, anchors: { offset: -72 }, respectReducedMotion: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
