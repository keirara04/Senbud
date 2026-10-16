// Brand colours shared by web (web/app/globals.css) and mobile. Keep the two in sync.
export const colors = {
  panel: "#1f3fd8",
  panel2: "#1733b5",
  onPanel: "#f4f6ff",
  onPanelDim: "#c9d2ff",
  hl: "#eeff5a",
  coral: "#ff6b5b",
  mint: "#4fd1a5",
  receipt: "#ffffff",
  receiptInk: "#1a1c2e",
  light: { paper: "#f5f6fa", paper2: "#ffffff", ink: "#1a1c2e", inkDim: "#565b75", accentInk: "#1f3fd8" },
  dark: { paper: "#0b1033", paper2: "#131a4a", ink: "#eef0ff", inkDim: "#a8b0d8", accentInk: "#eeff5a" },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 16, lg: 24 } as const;
