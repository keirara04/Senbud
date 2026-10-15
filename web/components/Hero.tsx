import { Check } from "lucide-react";
import { HeroDemo } from "./HeroDemo";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-panel text-on-panel">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-white/15 blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 min-[900px]:grid-cols-[1.05fr_1fr] min-[900px]:items-center min-[900px]:pb-28 min-[900px]:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] leading-[1.02]">
            Your money buddy that does the <em className="marker marker-load marker-soft text-hl">boring part.</em>
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-on-panel-dim">
            Snap a receipt or type “lunch 12, grab 8”. Senbud logs it, counts down to rent, and tells you when you
            can actually afford that burger.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#waitlist"
              className="hl-sweep rounded-full bg-hl px-6 py-3.5 text-center font-semibold text-panel transition-transform hover:-translate-y-0.5"
            >
              Get early access
            </a>
            <a
              href="#how"
              className="rounded-full border border-panel-line px-6 py-3.5 text-center font-semibold text-on-panel transition-colors hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-panel-dim">
            {["No bank password", "No sign-up to try", "Free plan forever"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check size={16} className="text-hl" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}
