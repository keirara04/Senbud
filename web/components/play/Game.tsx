"use client";

import { Check, CircleCheck, Coins, Heart, ScrollText, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { CLASSES, type ClassId, DAYS, ENDINGS, MAX_MORALE, MONSTERS, type MonsterId, SPELLS, type SpellId } from "@/lib/game/data";
import { type Action, act, afford, canAct, newGame, resistBonus, type State } from "@/lib/game/engine";
import { daysToRent, HOURLY_RATE, hoursLabel, narrateAll } from "@/lib/game/narrate";
import { track } from "@/lib/track";
import styles from "./play.module.css";
import { shareCard } from "./shareCard";
import { play } from "./sound";
import { Sprite, type SpriteName } from "./Sprite";

const HERO: Record<ClassId, SpriteName> = {
  scholar: "hero-scholar",
  freelancer: "hero-freelancer",
  homeCook: "hero-home-cook",
};

const MONSTER_SPRITE: Record<MonsterId, SpriteName> = {
  impulseGoblin: "monster-impulse-goblin",
  subscriptionSlime: "monster-subscription-slime",
  cravingWraith: "monster-craving-wraith",
  grabGolem: "monster-grab-golem",
  boredomImp: "monster-boredom-imp",
  textbookTroll: "monster-textbook-troll",
  lateFeeLich: "monster-late-fee-lich",
  rentDragon: "boss-rent-dragon",
};

const SPELL_ORDER: SpellId[] = ["snapScroll", "partySplit", "hoursSight", "wardOfBudget"];
const BEST_KEY = "senbud:dungeon:best";
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Cards sit on the darker cobalt (6.5:1 for dim text); secondary controls on the base cobalt.
const card = "rounded-3xl border border-panel-line bg-panel-2";
const secondary = "border border-panel-line bg-panel hover:bg-white/10";
const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-left font-semibold transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

type Pop = { id: number; text: string; tone: "loss" | "gain" };

const noop = () => () => {};
function readBest() {
  try {
    return localStorage.getItem(BEST_KEY);
  } catch {
    return null; // Storage blocked: no saved title.
  }
}

/** Largest whole-number scale at which the 160×90 scene fits the container. */
function useSceneScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.max(1, Math.min(6, Math.floor(e.contentRect.width / 160)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, scale] as const;
}

export function Game() {
  const [screen, setScreen] = useState<"select" | "play" | "end">("select");
  const [cls, setCls] = useState<ClassId>("scholar");
  const [game, setGame] = useState<State | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [rolling, setRolling] = useState<number | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [spellsOpen, setSpellsOpen] = useState(false);
  const [sound, setSound] = useState(false);
  // Title from a previous visit (read client-side only), then the latest title once a run ends.
  const storedBest = useSyncExternalStore(noop, readBest, () => null);
  const [lastTitle, setLastTitle] = useState<string | null>(null);
  const best = lastTitle ?? storedBest;
  const [shareNote, setShareNote] = useState("");
  const timers = useRef<number[]>([]);
  // Set synchronously so a second key press during the die tumble can't act on stale state.
  const busy = useRef(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const sfx = useCallback((name: Parameters<typeof play>[0]) => sound && play(name), [sound]);

  const apply = useCallback(
    (next: State) => {
      setGame(next);
      setSpellsOpen(false);
      setLines((prev) => [...prev, ...narrateAll(next.log)].slice(-6));
      const paid = next.log.reduce((n, e) => (e.kind === "pay" ? n + e.amount : n), 0);
      const earned = next.log.reduce((n, e) => (e.kind === "income" ? n + e.amount : n), 0);
      if (paid) {
        setPop({ id: Date.now(), text: `−$${paid}`, tone: "loss" });
        sfx("coin");
      } else if (earned) {
        setPop({ id: Date.now(), text: `+$${earned}`, tone: "gain" });
        sfx("coin");
      }
      if (next.log.some((e) => e.kind === "appear" && e.monster === "rentDragon")) sfx("roar");
      if (next.ending) {
        sfx(next.ending === "slainByRent" ? "lose" : "win");
        track("dungeon_end", { class: next.cls, ending: next.ending });
        try {
          // Stored now; `best` keeps showing the previous title until the next run.
          localStorage.setItem(BEST_KEY, ENDINGS[next.ending].title);
        } catch {
          // Ignore storage errors.
        }
        timers.current.push(window.setTimeout(() => setScreen("end"), reduce ? 0 : 900));
      }
    },
    [reduce, sfx],
  );

  const start = (c: ClassId) => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0;
    const s = newGame(c, seed);
    setCls(c);
    setGame(s);
    setLines(narrateAll(s.log));
    setPop(null);
    setShareNote("");
    setScreen("play");
    track("dungeon_start", { class: c });
  };

  const doAction = useCallback(
    (a: Action) => {
      if (!game || busy.current || !canAct(game, a)) return;
      const next = act(game, a);
      if (a.type !== "resist" || reduce) return apply(next);
      // Tumble the die, show the real face for a beat, then resolve.
      const roll = next.log.find((e) => e.kind === "roll");
      const final = roll?.kind === "roll" ? roll.d20 : 10;
      busy.current = true;
      sfx("roll");
      const spin = window.setInterval(() => setRolling(1 + Math.floor(Math.random() * 20)), 70);
      timers.current.push(
        spin,
        window.setTimeout(() => {
          clearInterval(spin);
          setRolling(final);
        }, 600),
        window.setTimeout(() => {
          busy.current = false;
          setRolling(null);
          apply(next);
        }, 1050),
      );
    },
    [apply, game, reduce, sfx],
  );

  // Keyboard: 1 Pay · 2 Resist · 3 Flee · 4 Spells (then 1–4 cast, Esc closes).
  useEffect(() => {
    if (screen !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).tagName === "INPUT") return;
      const n = Number(e.key);
      if (spellsOpen) {
        if (e.key === "Escape") setSpellsOpen(false);
        else if (n >= 1 && n <= 4) doAction({ type: "cast", spell: SPELL_ORDER[n - 1] });
        return;
      }
      if (n === 1) doAction({ type: "pay" });
      if (n === 2) doAction({ type: "resist" });
      if (n === 3) doAction({ type: "flee" });
      if (n === 4) setSpellsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doAction, screen, spellsOpen]);

  const soundToggle = (
    <button
      type="button"
      onClick={() => setSound((v) => !v)}
      aria-pressed={sound}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-panel-line px-4 text-sm text-on-panel-dim hover:text-on-panel"
    >
      {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
      Sound {sound ? "on" : "off"}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[688px] px-4 pb-16 pt-8 sm:px-6">
      {screen === "select" && (
        <ClassSelect cls={cls} setCls={setCls} onStart={start} best={best} soundToggle={soundToggle} />
      )}
      {screen === "play" && game && (
        <Board
          soundToggle={soundToggle}
          game={game}
          lines={lines}
          rolling={rolling}
          pop={pop}
          spellsOpen={spellsOpen}
          setSpellsOpen={setSpellsOpen}
          onAction={doAction}
        />
      )}
      {screen === "end" && game && (
        <EndScreen
          game={game}
          best={best}
          shareNote={shareNote}
          onShare={async () => {
            try {
              const how = await shareCard(game);
              if (how === "cancelled") return;
              setShareNote(how === "shared" ? "Shared!" : "Card downloaded.");
              track("dungeon_share", { ending: game.ending! });
            } catch {
              setShareNote("Couldn’t make the card. Try again.");
            }
          }}
          onAgain={() => {
            setLastTitle(ENDINGS[game.ending!].title);
            setScreen("select");
          }}
        />
      )}
    </div>
  );
}

// ---------- class select ----------

function ClassSelect({
  cls,
  setCls,
  onStart,
  best,
  soundToggle,
}: {
  cls: ClassId;
  setCls: (c: ClassId) => void;
  onStart: (c: ClassId) => void;
  best: string | null;
  soundToggle: React.ReactNode;
}) {
  return (
    <section aria-labelledby="dungeon-title">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-hl">A 2-minute mini game</p>
      <h1 id="dungeon-title" className="font-display mt-2 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.04]">
        The Budget <em className="text-hl">Dungeon</em>
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-on-panel-dim">
        Survive one week. Pay the <strong className="text-on-panel">Rent Dragon</strong> on Friday. Treat yourself
        without going broke.
      </p>
      <ul className="mt-6 grid gap-3 text-on-panel-dim sm:grid-cols-3">
        <li className="flex items-start gap-2">
          <Coins size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" /> Gold is your weekly budget
        </li>
        <li className="flex items-start gap-2">
          <Heart size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" /> Skip every treat and morale drops
        </li>
        <li className="flex items-start gap-2">
          <ScrollText size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" /> Every spell is a real Senbud feature
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Choose your class</h2>
      <div role="radiogroup" aria-label="Class" className="mt-3 grid gap-3 sm:grid-cols-3">
        {(Object.keys(CLASSES) as ClassId[]).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cls === c}
            onClick={() => setCls(c)}
            className={`flex items-center gap-4 rounded-3xl border p-4 text-left transition-colors sm:flex-col sm:items-start ${
              cls === c ? "border-hl bg-panel-2" : "border-panel-line hover:bg-panel-2/60"
            }`}
          >
            <Sprite name={HERO[c]} scale={3} />
            <span>
              <span className="block text-lg font-semibold">{CLASSES[c].name}</span>
              <span className="block text-sm text-hl">${CLASSES[c].gold} gold</span>
              <span className="mt-1 block text-sm text-on-panel-dim">{CLASSES[c].blurb}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => onStart(cls)}
          className="w-full rounded-full bg-hl px-6 py-4 text-lg font-semibold text-panel transition-transform hover:-translate-y-0.5 sm:w-auto"
        >
          Enter the dungeon as {CLASSES[cls].name}
        </button>
        <div className="self-center sm:self-auto">{soundToggle}</div>
      </div>
      {best && <p className="mt-4 text-sm text-on-panel-dim">Your last title: {best}</p>}
    </section>
  );
}

// ---------- the board ----------

function Board({
  game,
  lines,
  rolling,
  pop,
  spellsOpen,
  setSpellsOpen,
  onAction,
  soundToggle,
}: {
  soundToggle: React.ReactNode;
  game: State;
  lines: string[];
  rolling: number | null;
  pop: Pop | null;
  spellsOpen: boolean;
  setSpellsOpen: (v: boolean) => void;
  onAction: (a: Action) => void;
}) {
  const [sceneRef, scale] = useSceneScale();
  const e = game.encounter;
  const m = e ? MONSTERS[e.monster] : null;
  const rent = daysToRent(game);
  const busy = rolling !== null || !e;
  const need = m?.dc != null ? Math.min(20, Math.max(2, m.dc - resistBonus(game))) : null;
  const check = e ? afford(game, e.cost) : null;
  const dragon = e?.monster === "rentDragon";

  return (
    <section aria-label="The Budget Dungeon">
      {/* Day + HUD */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl">{FULL_DAYS[game.floor - 1]}</p>
          <div className="mt-1 flex items-center gap-1" aria-label={`Day ${game.floor} of 7`}>
            {DAYS.map((d, i) => (
              <span
                key={d}
                title={d}
                className={`h-1.5 w-5 rounded-full ${i < game.floor ? "bg-hl" : "bg-panel-line"} ${i === 4 ? "outline outline-1 outline-offset-1 outline-coral" : ""}`}
              />
            ))}
          </div>
        </div>
        {soundToggle}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Gold" value={`$${game.gold}`} hint="Your weekly budget" />
        <Stat
          label="Morale"
          value={
            <span aria-label={`${game.morale} of ${MAX_MORALE}`} className="flex gap-1">
              {Array.from({ length: MAX_MORALE }, (_, i) => (
                <Heart
                  key={i}
                  size={16}
                  aria-hidden="true"
                  className={i < game.morale ? "fill-coral text-coral" : "text-on-panel-dim"}
                />
              ))}
            </span>
          }
          hint={`${game.morale} of ${MAX_MORALE}`}
        />
        <Stat
          label="Rent Dragon"
          value={
            rent === null ? (
              <span className="inline-flex items-center gap-1">
                <Check size={18} aria-hidden="true" className="text-hl" /> Paid
              </span>
            ) : rent === 0 ? (
              "Today!"
            ) : (
              `in ${rent} day${rent === 1 ? "" : "s"}`
            )
          }
          hint={rent === null ? "Slain on Friday" : "$40 due Friday"}
        />
        <Stat label="Spells" value={`${game.castsLeft} left`} hint="3 per run" />
      </div>

      {/* Scene */}
      <div ref={sceneRef} className="mt-4">
        <div
          className="relative mx-auto overflow-hidden rounded-3xl border border-panel-line"
          style={{ width: 160 * scale, height: 90 * scale }}
        >
          {/* The dungeon darkens as the week goes on; sprites keep their true colours. */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${styles.scene}`}
            style={{
              backgroundImage: "url(/play/bg-dungeon.png)",
              backgroundSize: "100% 100%",
              filter: `brightness(${1 - (game.floor - 1) * 0.05}) saturate(${1 + (game.floor - 1) * 0.05})`,
            }}
          />
          <Sprite
            name={HERO[game.cls]}
            scale={scale}
            label={CLASSES[game.cls].name}
            style={{ position: "absolute", left: 22 * scale, top: 50 * scale }}
          />
          <AnimatePresence mode="popLayout">
            {e && (
              <motion.div
                key={`${game.floor}-${e.monster}-${game.queue.length}`}
                initial={{ opacity: 0, x: 12 * scale }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: 6 * scale }}
                transition={{ duration: 0.3 }}
                style={{ position: "absolute", left: (dragon ? 88 : 108) * scale, top: (dragon ? 20 : 50) * scale }}
              >
                <Sprite name={MONSTER_SPRITE[e.monster]} scale={scale} label={m!.name} flip={!dragon} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {pop && (
              <motion.div
                key={pop.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -18 * scale }}
                transition={{ duration: 1.1 }}
                className={`pointer-events-none absolute font-mono text-xl font-bold ${pop.tone === "loss" ? "text-coral" : "text-mint"}`}
                style={{ left: 26 * scale, top: 40 * scale }}
                aria-hidden="true"
              >
                {pop.text}
              </motion.div>
            )}
          </AnimatePresence>
          {lines.length > 0 && (
            <p
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-3 py-1 text-center text-xs text-on-panel sm:px-4 sm:py-2 sm:text-sm"
            >
              {lines.at(-1)}
            </p>
          )}
          {rolling !== null && (
            <div className="absolute inset-0 grid place-items-center bg-black/40" aria-hidden="true">
              <motion.div
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 0.6, ease: "linear" }}
                className="relative grid place-items-center"
              >
                <Sprite name="item-d20" scale={scale * 3} />
              </motion.div>
              <span className="absolute font-mono text-3xl font-bold text-hl drop-shadow">{rolling}</span>
            </div>
          )}
        </div>
      </div>

      {/* Encounter card */}
      {e && m && (
        <div className={`mt-4 p-4 sm:p-5 ${card}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{m.name}</h2>
            <span className="font-mono text-lg text-hl">${e.cost}</span>
          </div>
          <p className="mt-1 italic text-on-panel-dim">“{m.line}”</p>
          {check && (
            <p className={`mt-3 flex items-start gap-2 text-sm ${check.ok ? "text-on-panel" : "text-hl"}`}>
              {check.ok ? (
                <CircleCheck size={18} aria-hidden="true" className="mt-px shrink-0 text-hl" />
              ) : (
                <TriangleAlert size={18} aria-hidden="true" className="mt-px shrink-0" />
              )}
              <span>
                <span className="font-semibold">Can I afford it? </span>
                {check.ok
                  ? `Yes, $${check.left} spare after rent and bills.`
                  : `No, you'd be $${-check.left} short for rent and bills.`}
              </span>
            </p>
          )}

          {!spellsOpen ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => onAction({ type: "pay" })} className={`${btn} bg-hl text-panel`}>
                <Kbd>1</Kbd>
                <span>
                  Pay ${e.cost}
                  <span className="block text-xs font-normal opacity-80">
                    {hoursLabel(e.cost)} of work
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy || !canAct(game, { type: "resist" })}
                onClick={() => onAction({ type: "resist" })}
                className={`${btn} ${secondary}`}
              >
                <Kbd>2</Kbd>
                <span>
                  Resist
                  <span className="block text-xs font-normal text-on-panel-dim">
                    {need !== null ? `need ${need}+ on d20${game.nextResistBonus ? " · +4 ready" : ""}` : "can't resist this"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy || !canAct(game, { type: "flee" })}
                onClick={() => onAction({ type: "flee" })}
                className={`${btn} ${secondary}`}
              >
                <Kbd>3</Kbd>
                <span>
                  Flee
                  <span className="block text-xs font-normal text-on-panel-dim">
                    {canAct(game, { type: "flee" }) ? "free, morale −1" : "can't flee this"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy || game.castsLeft < 1}
                onClick={() => setSpellsOpen(true)}
                className={`${btn} ${secondary}`}
              >
                <Kbd>4</Kbd>
                <span>
                  Spells
                  <span className="block text-xs font-normal text-on-panel-dim">{game.castsLeft} left</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {SPELL_ORDER.map((id, i) => {
                  const a: Action = { type: "cast", spell: id };
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={busy || !canAct(game, a)}
                      onClick={() => onAction(a)}
                      className={`${btn} items-start ${secondary}`}
                    >
                      <Kbd>{i + 1}</Kbd>
                      <span>
                        {SPELLS[id].name}
                        <span className="block text-xs font-normal text-on-panel-dim">{SPELLS[id].blurb}</span>
                        <span className="block text-xs font-normal text-hl">Senbud feature: {SPELLS[id].feature}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setSpellsOpen(false)}
                className="mt-2 inline-flex min-h-11 items-center text-sm text-on-panel-dim underline-offset-4 hover:underline"
              >
                Back (Esc)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Story log, read out to screen readers as it changes. */}
      <ol aria-live="polite" aria-label="What happened" className="mt-4 space-y-1 text-sm text-on-panel-dim">
        {lines.map((l, i) => (
          <li key={`${i}-${l}`} className={i === lines.length - 1 ? "text-on-panel" : undefined}>
            {l}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-panel-line bg-panel-2 px-3 py-2">
      <div className="text-xs text-on-panel-dim">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-xs text-on-panel-dim">{hint}</div>}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hidden h-6 min-w-6 place-items-center rounded-md border border-current/30 px-1 font-mono text-xs opacity-70 sm:inline-grid">
      {children}
    </kbd>
  );
}

// ---------- ending ----------

function EndScreen({
  game,
  best,
  shareNote,
  onShare,
  onAgain,
}: {
  game: State;
  best: string | null;
  shareNote: string;
  onShare: () => void;
  onAgain: () => void;
}) {
  const e = ENDINGS[game.ending!];
  const slain = game.ending === "slainByRent";
  return (
    <section aria-labelledby="ending-title" className="text-center">
      <div className="mx-auto flex w-fit items-end gap-4">
        <Sprite name={HERO[game.cls]} scale={4} label={CLASSES[game.cls].name} />
        {slain && <Sprite name="boss-rent-dragon" scale={2} label="Rent Dragon" />}
        {!slain && <Sprite name="item-coin" scale={4} />}
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-hl">Your title</p>
      <h1 id="ending-title" className="font-display mt-1 text-[clamp(2.4rem,7vw,4rem)] leading-none">
        {e.title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-lg text-on-panel-dim">{e.line}</p>

      <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-4">
        {[
          ["Gold left", `$${Math.max(0, game.gold)}`],
          ["Spent", `$${game.spent}`],
          ["Hours of work", hoursLabel(game.spent)],
          ["Treats", String(game.treats)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-panel-line bg-panel-2 px-3 py-2">
            <dt className="text-xs text-on-panel-dim">{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-on-panel-dim">Hours of work assume ${HOURLY_RATE}/hr part-time pay.</p>

      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:[&>*]:whitespace-nowrap">
        <Link
          href="/#waitlist"
          onClick={() => track("dungeon_cta", { ending: game.ending! })}
          className="rounded-full bg-hl px-6 py-3.5 font-semibold text-panel transition-transform hover:-translate-y-0.5"
        >
          Now do it with real money → Get Senbud
        </Link>
        <button type="button" onClick={onShare} className="rounded-full border border-panel-line px-6 py-3.5 font-semibold hover:bg-white/5">
          Share my card
        </button>
        <button type="button" onClick={onAgain} className="rounded-full border border-panel-line px-6 py-3.5 font-semibold hover:bg-white/5">
          Play again
        </button>
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-hl">
        {shareNote}
      </p>
      {best && best !== e.title && <p className="text-sm text-on-panel-dim">Previous title: {best}</p>}
      <p className="mx-auto mt-8 max-w-md text-sm text-on-panel-dim">
        Snap Scroll, Party Split, Hours Sight and Ward of Budget are real Senbud features: receipt capture, splitting
        with friends, hours of work and pace reminders.
      </p>
    </section>
  );
}
