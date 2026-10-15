import type { CSSProperties } from "react";
import styles from "./play.module.css";

export type SpriteName =
  | "hero-scholar"
  | "hero-freelancer"
  | "hero-home-cook"
  | "monster-impulse-goblin"
  | "monster-subscription-slime"
  | "monster-craving-wraith"
  | "monster-grab-golem"
  | "monster-boredom-imp"
  | "monster-textbook-troll"
  | "monster-late-fee-lich"
  | "boss-rent-dragon"
  | "item-coin"
  | "item-d20"
  | "item-spell-scroll"
  | "item-treat-potion";

const SIZE: Partial<Record<SpriteName, number>> = { "boss-rent-dragon": 64 };
const ONE_FRAME = new Set<SpriteName>(["item-coin", "item-d20", "item-spell-scroll", "item-treat-potion"]);

/** A pixel sprite drawn at a whole-number scale so pixels stay square and sharp. */
export function Sprite({
  name,
  scale,
  label,
  flip = false,
  style,
}: {
  name: SpriteName;
  scale: number;
  label?: string;
  flip?: boolean;
  style?: CSSProperties;
}) {
  const px = (SIZE[name] ?? (name.startsWith("item-") ? 16 : 32)) * scale;
  const frames = ONE_FRAME.has(name) ? 1 : 2;
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${styles.sprite} ${frames > 1 ? styles.idle : ""}`}
      style={{
        width: px,
        height: px,
        backgroundImage: `url(/play/${name}.png)`,
        backgroundSize: `${frames * 100}% 100%`,
        transform: flip ? "scaleX(-1)" : undefined,
        ...style,
      }}
    />
  );
}
