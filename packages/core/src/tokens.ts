// Senbud design tokens, shared by web (web/app/globals.css) and mobile. Keep the two in sync.
// Three layers: palette (raw values) -> theme (what a colour is for, per scheme) -> components (mobile/src/ui).
// Spec and contrast ratios: docs/senbud-app-design-system.md.

import type { Category } from "./index";

// 1. Palette. Screens never use these directly; they go through a theme.
export const palette = {
  cobalt: "#1f3fd8", // the "pen": panels, primary buttons, links on light
  cobaltDeep: "#1733b5", // pressed cobalt
  highlighter: "#eeff5a", // the one loud accent: key numbers on cobalt, markers, focus
  highlighterPressed: "#d4e64a",
  highlighterInk: "#4a5000",
  coral: "#ff6b5b", // fill only on light (2.8:1 on white)
  coralInk: "#9e2f22", // coral text on light
  coralLight: "#ff8a7d", // coral text on dark
  coralTint: "#ffd6cf",
  mint: "#4fd1a5", // fill only on light (1.9:1 on white)
  mintInk: "#155a44",
  mintTint: "#c4efdd",
  amber: "#f5c542",
  amberInk: "#8a5a00",
  amberTint: "#ffe9b8",
  violetInk: "#5b3fb8",
  violetTint: "#ece6ff",
  blueTint: "#e1e7fb",
  white: "#ffffff",
  paper: "#f5f6fa",
  ink: "#1a1c2e",
  inkDim: "#565b75",
  greyInk: "#3d4256",
  greyTint: "#e6e8f0",
  night: "#0b1033",
  night2: "#131a4a",
  night3: "#1c2560",
  moon: "#eef0ff",
  moonDim: "#a8b0d8",
  onCobalt: "#f4f6ff",
  onCobaltDim: "#c9d2ff",
  periwinklePressed: "#b3bff5", // pressed dark-mode primary
  placeholderInk: "#878ca3", // 3.3:1 on white
  placeholderMoon: "#666e9e", // 3.4:1 on night2
} as const;

// 2. Themes. Every pair used for text passes WCAG AA (4.5:1); see the doc's contrast table.
const light = {
  bg: palette.paper as string, // screen background (the notebook)
  surface: palette.white as string, // cards, inputs, receipts
  surfaceSunken: palette.greyTint as string, // tracks, pressed rows
  text: palette.ink as string,
  textDim: palette.inkDim as string,
  // Below AA on purpose: every field has a label, and a hint must not read as a value already typed.
  placeholder: palette.placeholderInk as string,
  line: "rgba(26, 28, 46, 0.12)",
  accent: palette.cobalt as string, // links, selected states
  tabActive: palette.cobalt as string, // the current tab's icon and label
  accentPressed: palette.cobaltDeep as string,
  onAccent: palette.onCobalt as string,
  primary: palette.cobalt as string, // primary button fill
  primaryPressed: palette.cobaltDeep as string,
  onPrimary: palette.onCobalt as string,
  panel: palette.cobalt as string, // the hero panel stays cobalt in both schemes
  onPanel: palette.onCobalt as string,
  onPanelDim: palette.onCobaltDim as string,
  highlight: palette.highlighter as string,
  onHighlight: palette.ink as string,
  good: palette.mintInk as string,
  goodFill: palette.mint as string,
  warn: palette.amberInk as string,
  warnFill: palette.amber as string,
  bad: palette.coralInk as string,
  badFill: palette.coral as string,
};

export type Theme = typeof light;

const dark: Theme = {
  bg: palette.night,
  surface: palette.night2,
  surfaceSunken: palette.night3,
  text: palette.moon,
  textDim: palette.moonDim,
  placeholder: palette.placeholderMoon,
  line: "rgba(255, 255, 255, 0.1)",
  // Cobalt on night is too dark to read, so periwinkle (11.1:1 on night2), not highlighter: the hero
  // number and the `highlight` button stay the only yellow. web/app/globals.css matches (`--accent-ink`).
  accent: palette.onCobaltDim,
  // The current tab stays highlighter: it is the "you are here" cue, and it has to read at a glance
  // even while the screen is still drawing (user decision, 17 Oct 2026). 15.0:1 on night2.
  tabActive: palette.highlighter,
  accentPressed: palette.periwinklePressed,
  onAccent: palette.ink,
  // Its own fill, so the one `highlight` button stays the only yellow thing on a dark screen
  // (user decision, 16 Oct 2026). Ink on periwinkle 11.3:1.
  primary: palette.onCobaltDim,
  primaryPressed: palette.periwinklePressed,
  onPrimary: palette.ink,
  panel: palette.cobalt,
  onPanel: palette.onCobalt,
  onPanelDim: palette.onCobaltDim,
  highlight: palette.highlighter,
  onHighlight: palette.ink,
  good: palette.mint,
  goodFill: palette.mint,
  warn: palette.amber,
  warnFill: palette.amber,
  bad: palette.coralLight,
  badFill: palette.coral,
};

export const themes = { light, dark } as const;

// Category chips: tint background + ink text, the pairs the web's bill split uses. Same in both schemes.
export const categoryColors: Record<Category, { bg: string; fg: string }> = {
  Food: { bg: palette.coralTint, fg: palette.coralInk },
  Transport: { bg: palette.blueTint, fg: palette.cobalt },
  Treat: { bg: palette.highlighter, fg: palette.highlighterInk },
  Groceries: { bg: palette.mintTint, fg: palette.mintInk },
  Subscription: { bg: palette.violetTint, fg: palette.violetInk },
  Other: { bg: palette.greyTint, fg: palette.greyInk },
};

// 4-point grid.
export const space = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

// System fonts only (SF Pro on iOS, Roboto on Android), as on the web. Sizes in points; tracking tightens
// as type grows, the way Apple sets display type.
export const type = {
  hero: { fontSize: 52, lineHeight: 58, fontWeight: "800", letterSpacing: -1.4 }, // the safe-to-spend number
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "400", letterSpacing: 0 },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: "600", letterSpacing: 0 },
  caption: { fontSize: 14, lineHeight: 19, fontWeight: "400", letterSpacing: 0 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.6 }, // uppercase section labels
} as const;

// Motion: the web's "highlighter" ease. Everything respects the OS reduce-motion setting.
export const motion = {
  fast: 150,
  base: 250,
  slow: 450,
  ease: [0.22, 0.68, 0.14, 1] as const, // cubic-bezier, same curve as web/app/globals.css
  undoMs: 5000, // how long Undo stays after a quick add
} as const;

// Apple asks for 44pt, Material for 48dp: 48 passes both.
export const touch = { min: 48 } as const;
