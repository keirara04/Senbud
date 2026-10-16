import type { ReactNode } from "react";
import { Bud } from "./Bud";

// The app's own icon set, copied from the screen concepts so the phones match the app.
const ICONS = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  budgets: <path d="M5 20v-8M10 20V5M15 20v-6M20 20V9" />,
  friends: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16.5 14.6c2.6.2 4.4 1.9 5 4.9" />
    </>
  ),
  jar: <path d="M7 3h10M8.5 3v3.2A5 5 0 0 0 5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a5 5 0 0 0-3.5-4.8V3M8.5 13.5h7" />,
  gear: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  chat: <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 10.5h8" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  pen: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  chev: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 5l-7 7 7 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  send: <path d="M12 19V5M6 11l6-6 6 6" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
};

export function Icon({ name, className = "ic" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const TABS = [
  ["home", "Home"],
  ["budgets", "Budgets"],
  ["bud", "Bud"],
  ["friends", "Friends"],
  ["treats", "Treats"],
] as const;

type Tab = (typeof TABS)[number][0];

// A 375 x 812 pt iPhone frame with the app's five-slot tab bar (Bud in the middle). It's a picture of
// the app, so screen readers get the caption beside it instead of the fake controls inside.
export function Phone({ tab, className = "", children }: { tab?: Tab; className?: string; children: ReactNode }) {
  return (
    <div className={`phone ${className}`} aria-hidden="true">
      <div className="sb">
        <span>9:41</span>
        <i />
      </div>
      {children}
      {tab && (
        <div className="tabs">
          {TABS.map(([key, label]) =>
            key === "bud" ? (
              <span key={key} className="budtab">
                <span className="fab">
                  <Bud size={38} />
                </span>
                <span className="bl">{label}</span>
              </span>
            ) : (
              <span key={key} className={key === tab ? "on" : undefined}>
                <Icon name={key === "treats" ? "jar" : key} />
                {label}
              </span>
            ),
          )}
        </div>
      )}
      <span className="home-ind" />
    </div>
  );
}
