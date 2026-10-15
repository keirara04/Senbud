"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarClock, Repeat } from "lucide-react";
import { useId, useState } from "react";
import { afford, hoursOfWork, money, type Verdict } from "@/lib/demo";
import { h2, wrap } from "./Sections";

const WEEK = { left: 54, daysLeft: 4, weeklyBudget: 100 };
const HOURLY = 12;

const VERDICT: Record<Verdict, { title: string; tone: string }> = {
  yes: { title: "Yes, go for it", tone: "bg-mint/25 text-[#14583f] dark:text-mint" },
  tight: { title: "Doable, but tight", tone: "bg-hl text-[#4a5000]" },
  no: { title: "Not this week", tone: "bg-coral/20 text-[#9e2f22] dark:text-coral" },
};

function AffordTile() {
  const id = useId();
  const [price, setPrice] = useState("40");
  const value = Number(price);
  const valid = value > 0 && value < 100_000;
  const result = valid ? afford(value, WEEK) : null;

  return (
    <div className="rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-8 lg:row-span-2">
      <h3 className="text-xl font-semibold">Can I afford it?</h3>
      <p className="mt-1.5 text-ink-dim">Ask before you buy. Senbud checks your week, keeps rent safe, and answers straight.</p>
      <label htmlFor={id} className="mt-6 block text-sm font-medium">
        Price of the thing you want
      </label>
      <div className="mt-2 flex items-center rounded-2xl bg-paper px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent-ink">
        <span className="font-display text-3xl text-ink-dim">$</span>
        <input
          id={id}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
          className="w-full bg-transparent px-2 py-3 font-display text-4xl tabular-nums focus:outline-none"
        />
      </div>
      <div aria-live="polite" className="mt-5 min-h-[9.5rem]">
        {!result && <p className="text-ink-dim">Enter a price, like 40.</p>}
        {result && (
          <motion.div key={result.verdict} initial={{ opacity: 0.5, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <p className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${VERDICT[result.verdict].tone}`}>
              {VERDICT[result.verdict].title}
            </p>
            <p className="mt-3 text-lg">
              {result.verdict === "no"
                ? `You have ${money(WEEK.left)} left this week and rent is in 6 days. It fits next week.`
                : result.perDayAfter < 0.01
                  ? "It would use everything left this week. Rent stays covered, but there’s nothing left for food until Monday."
                  : `You'd still have ${money(Math.floor(result.perDayAfter * 100) / 100)} a day until Sunday, and rent stays covered.`}
            </p>
            <p className="mt-2 text-ink-dim">
              That’s {hoursOfWork(value, HOURLY)} hours of work at {money(HOURLY)} an hour.
            </p>
          </motion.div>
        )}
      </div>
      <p className="mt-4 text-sm text-ink-dim">Example week: {money(WEEK.left)} left of {money(WEEK.weeklyBudget)}, 4 days to go.</p>
    </div>
  );
}

function Jar({ fill }: { fill: number }) {
  const reduced = useReducedMotion();
  const h = 84 * fill;
  return (
    <svg viewBox="0 0 80 110" className="h-28 w-auto" aria-hidden="true">
      <rect x="18" y="4" width="44" height="12" rx="4" fill="var(--panel)" />
      <path d="M14 22h52c4 0 6 3 6 7v68c0 7-5 11-12 11H20c-7 0-12-4-12-11V29c0-4 2-7 6-7z" fill="rgb(255 255 255 / .35)" stroke="var(--panel)" strokeWidth="3" />
      <clipPath id="jar-clip">
        <path d="M14 22h52c4 0 6 3 6 7v68c0 7-5 11-12 11H20c-7 0-12-4-12-11V29c0-4 2-7 6-7z" />
      </clipPath>
      <motion.rect
        clipPath="url(#jar-clip)"
        x="0"
        width="80"
        fill="var(--panel)"
        fillOpacity=".85"
        initial={{ y: 108, height: 0 }}
        whileInView={{ y: 108 - h, height: h }}
        viewport={{ once: true }}
        transition={{ duration: reduced ? 0 : 1.1, ease: [0.22, 0.68, 0.14, 1] }}
      />
    </svg>
  );
}

export function Brain() {
  return (
    <section>
      <div className={`${wrap} py-20 sm:py-28`}>
        <h2 className={`${h2} max-w-3xl`}>It does the maths you’d <span className="marker">rather skip.</span></h2>
        <p className="mt-5 max-w-xl text-lg text-ink-dim">
          No charts to decode. Senbud turns what you spent into a few plain answers, and speaks up at most once a day.
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr] lg:grid-rows-[auto_auto]">
          <AffordTile />

          <div className="flex flex-col justify-between rounded-3xl bg-panel p-6 text-on-panel sm:p-8">
            <CalendarClock className="text-hl" aria-hidden="true" />
            <div className="mt-10">
              <p className="font-display text-6xl">6 days</p>
              <p className="mt-2 text-on-panel-dim">until rent. $650 is already set aside, so it never counts as spending money.</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 rounded-3xl bg-hl p-6 text-panel sm:p-8">
            <div>
              <h3 className="text-xl font-semibold">Treat jar</h3>
              <p className="mt-1.5 text-panel/80">Money you didn’t spend last week rolls in here.</p>
              <p className="mt-6 font-display text-5xl">$23</p>
              <p className="mt-1 font-medium">That’s 3 bubble teas, guilt-free.</p>
            </div>
            <Jar fill={0.58} />
          </div>

          <div className="rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-8 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Repeat className="text-accent-ink" aria-hidden="true" />
              <h3 className="text-xl font-semibold">Subscriptions it noticed</h3>
            </div>
            <ul className="mt-5 divide-y divide-line">
              {[
                ["Spotify", "renews tomorrow", "$11.99"],
                ["Netflix", "not opened in 6 weeks. Still watching?", "$15.49"],
                ["iCloud", "renews on the 28th", "$2.99"],
              ].map(([name, note, price]) => (
                <li key={name} className="flex items-baseline justify-between gap-4 py-3">
                  <span>
                    <span className="font-semibold">{name}</span> <span className="text-ink-dim">{note}</span>
                  </span>
                  <span className="tabular-nums">{price}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
