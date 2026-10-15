import { Dices } from "lucide-react";
import Link from "next/link";
import { Sprite } from "./play/Sprite";

// Landing-page teaser for the /play mini game. A paper card, so it doesn't merge with the cobalt section after it.
export function PlayTeaser() {
  return (
    <section aria-labelledby="play-title" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 overflow-hidden rounded-[2rem] border border-line bg-paper-2 p-8 text-ink sm:p-12 md:flex-row md:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-ink">2-minute mini game</p>
          <h2 id="play-title" className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">
            Can you <em className="text-accent-ink">survive</em> the week?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-dim">
            Dodge the Impulse Goblin, cancel the Subscription Slime and pay the Rent Dragon on Friday. Every spell is a
            real Senbud feature.
          </p>
          <Link
            href="/play"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-panel px-6 font-semibold text-on-panel transition-transform hover:-translate-y-0.5"
          >
            <Dices size={18} aria-hidden="true" /> Play the Budget Dungeon
          </Link>
        </div>
        <div className="flex items-end gap-3" aria-hidden="true">
          <Sprite name="hero-scholar" scale={3} />
          <Sprite name="item-d20" scale={3} style={{ marginBottom: 12 }} />
          <Sprite name="boss-rent-dragon" scale={3} />
        </div>
      </div>
    </section>
  );
}
