# Senbud: The Budget Dungeon (`/play`)

Status: design locked, no code yet. Date: 16 October 2026.

A 2–3 minute, dice-rolling fantasy RPG mini game on its own page, `/play`. Every mechanic stands for a real Senbud feature, so playing the game demos the product.

> **Trademark rule:** never write "Dungeons & Dragons", "D&D" or any Wizards of the Coast monster names in copy, code, file names or ads. Call it a "dice-rolling fantasy RPG". Dice, classes, HP and d20 checks are generic mechanics and fine to use.

---

## 1. Decisions

| Item | Decision |
|---|---|
| Classes | All 3: Scholar, Freelancer, Home Cook |
| Art | Pixel art generated with the pixel-art skill, then cleaned up by hand where needed |
| Placement | Its own page, `/play`, with a teaser card on the landing page |
| Length | 7 floors (Mon–Sun), about 2–3 minutes |
| Saves | None. Each visit is a fresh run; the best title is kept in localStorage (optional) |
| Target win rate | About 40% "Budget Paladin" for a sensible player. Tune in phase 2 |

---

## 2. Core loop

```
Pick class → Floor 1 (Mon) … Floor 7 (Sun)
Each floor: 1–2 encounters (+ a scripted encounter on some floors)
Each encounter: ⚔️ Pay · 🛡️ Resist (d20) · ✨ Cast spell · 🏃 Flee
Friday: 🐉 Rent Dragon must be paid in full
Sunday: ending + title + share card + CTA
```

**Status bar:**
- ❤️ Gold
- 🐉 Rent Dragon: floors left and gold needed
- 😊 Morale (0–5)
- 🧪 Treat jar
- ✨ Spells left

---

## 3. Stats

| Stat | Start | Notes |
|---|---|---|
| Gold | by class | Your weekly budget. At 0 you can't pay anything |
| Morale | 3 / 5 | Below 1 you're "burnt out": Resist rolls get −3 |
| Discipline | +0 | Added to Resist rolls. Snap Scroll gives +1 for the rest of the run |
| Treat jar | 0 | Leftover gold at the end of each floor; costs nothing |
| Rent due | 40 gold on floor 5 (Friday) | Fixed |

## 4. Classes

| Class | Gold | Perk | Weakness |
|---|---|---|---|
| 🎓 Scholar | 95 | +2 on Resist rolls | Textbook Troll costs 30, not 25 |
| 🧑‍💻 Freelancer | 60 | "Client Paid" event: 50% chance on floors 2, 4 and 6 of +25 gold | No other perk; high risk, high reward |
| 🍳 Home Cook | 115 | Food monsters cost half | The Boredom Imp visits Tue, Thu and Sat |

**Starting-gold check:** the unavoidable costs are Grab Golem ×2 (16), the Textbook Troll (25, or 30 for the Scholar) and the Rent Dragon (40). That's 81 in total, or 86 for the Scholar.

The numbers above were tuned in phase 1 (see section 14).

## 5. Monsters

| Monster | Cost | Can resist? | Notes |
|---|---|---|---|
| 👺 Impulse Goblin | 5–15 | Yes, DC 12 | Shows up often. If the Resist roll fails, it steals 5 gold |
| 🟢 Subscription Slime | 5 | Yes, DC 10 | Paying, or failing to resist, keeps you subscribed: it returns 2 floors later. A successful Resist **cancels** it for good. You can't flee it |
| 🍔 Craving Wraith | 6 | Yes, DC 11 | Paying it **is** the treat: pay 6, gain +2 morale. Resisting skips it for free |
| 🚕 Grab Golem | 8 | No | Unavoidable transport. Appears twice per run |
| 😐 Boredom Imp | 5 | No | Pay 5 for cheap fun (morale stays), or flee (morale −1) |
| 📚 Textbook Troll | 25 | No | A mini-boss on floor 3 |
| 💀 Late-Fee Lich | 10 | No | Appears on floor 4 if gold < 40 (rent not set aside) |
| 🐉 Rent Dragon | 40 | No | The boss on floor 5. If you can't pay, you're defeated |

**Encounter table per floor** (randomness is seeded, so a run can be replayed):
- Floor 1: Impulse Goblin + Grab Golem
- Floor 2: Craving Wraith + Subscription Slime
- Floor 3: Textbook Troll + 1 random
- Floor 4: Impulse Goblin, plus the Late-Fee Lich check
- Floor 5: Rent Dragon
- Floor 6: Craving Wraith + Grab Golem
- Floor 7: Impulse Goblin

On top of that, the Slime returns every 2 floors while you're subscribed, and the Home Cook's Imp comes on floors 2, 4 and 6.

The random pool is Goblin, Wraith and Imp.

## 6. Actions

| Action | Effect |
|---|---|
| ⚔️ Pay | Lose gold equal to the cost. The encounter is cleared |
| 🛡️ Resist | Roll d20 + discipline + class bonus against the monster's difficulty (DC). Success clears it for free. Failure follows the monster's rule (usually you pay the cost) |
| ✨ Cast spell | Uses one spell (see section 7) |
| 🏃 Flee | Free, but morale −1. Not allowed against unavoidable monsters |

A natural 20 on Resist always succeeds and gives +1 morale. A natural 1 always fails and you pay the failure cost plus 2 (for the Goblin: 5 + 2).

## 7. Spells (each one is a Senbud feature)

You get 3 casts per run, and you choose which spell each time.

| Spell | Effect | Feature |
|---|---|---|
| 🔮 Divination | Shows "Can I afford it?": the gold left after paying and whether rent is still covered. Free, unlimited query; doesn't use a cast | Can I afford it? |
| 📜 Snap Scroll | Clears an encounter at full cost but gives +1 discipline for the rest of the run | Receipt capture |
| 🤝 Party Split | Halves the cost of a food or Big encounter (adds a "Sarah owes you" IOU) | Split with friends |
| ⏳ Hours Sight | Shows the cost as hours of work and gives +4 on the next Resist | Hours of work |
| 🛡️ Ward of Budget | Warns before you pay if your spending pace means rent won't be covered, and blocks the Late-Fee Lich once | Pace reminders |

## 8. Endings (after floor 7)

| Title | Condition | Line |
|---|---|---|
| 🏆 Budget Paladin | Rent paid, gold ≥ 10, morale ≥ 3 | "Rent slain, treats enjoyed. Legend." |
| 🎻 Treat Bard | Rent paid, morale 5, gold < 5 | "Fun week. Your wallet disagrees." |
| 🪙 Lonely Miser | Rent paid, gold ≥ 10, morale < 3 | "Rich, but you skipped every treat. Was it worth it?" |
| 🍜 Ramen Ranger | Rent paid, any other case (low gold) | "You survived… on instant noodles." |

Endings are checked top to bottom, and the first match wins.
| 💀 Slain by Rent | Rent not paid | "Senbud would've warned you on Wednesday 😉" |

**End screen:**
- the week's summary: spent, saved, treats, hours of work and spells used
- a share card
- **"Now play it with real money → Try Senbud free"** plus the waitlist form
- "Play again" with a different class

---

## 9. Pixel art (pixel-art skill)

| Asset | Size | Frames |
|---|---|---|
| 3 class heroes | 32×32 | idle (2) |
| 7 monsters + Rent Dragon | 32×32 (Dragon 64×64) | idle (2), hit (1) |
| Dungeon background (one image; it darkens as the week goes on, applied with a CSS filter) | 160×90 | 1 |
| Items: gold coin, treat potion, spell scroll, d20 | 16×16 | 1 (the d20 spins with Motion) |

**Palette:**
- Senbud cobalt (`#1F3FD8`, `#1733B5`, `#8FA3FF`; the script still calls these `purple*`)
- coin gold
- dragon red-orange
- dungeon dark grey-blue
- at most 16 colours in total

**Rendering:** draw at whole-number scales only with `image-rendering: pixelated`, so the art stays sharp. Images live in `web/public/play/`.

---

## 10. Tech (matches the Senbud stack)

| Piece | Choice |
|---|---|
| Rules | `web/lib/game/`: plain TypeScript (state, encounter tables, seeded d20, endings), no React |
| Tests | Vitest: win and lose paths, the Late-Fee Lich trigger, each class's perk, seeded replays. Plus a script that plays 10,000 runs with a "sensible player" strategy to tune the win rate to about 40% |
| Screens | `web/app/play/page.tsx` (a server component with metadata) renders the client component `components/play/Game.tsx`. Motion handles the dice roll, damage numbers and monster transitions |
| Sound | Off by default. Synthesized with WebAudio, so there are no sound files |
| Share card | Canvas image made in the browser: hero sprite, title, stats and the `senbud.app/play` link |
| Accessibility | Every action has a keyboard shortcut (1–4). Story text is read out to screen readers. Reduced-motion skips animations. Never relies on colour alone |
| Size budget | Under 150KB of code for `/play`, plus under 100KB of sprites. **Measured:** 9.7KB gzipped of game-only JS and 64KB of sprites. React, Next and Motion add 223KB gzipped, shared with `/` |
| Analytics | Anonymous counts only: `dungeon_start`, `dungeon_end`, `dungeon_share` and `dungeon_cta`, sent through `lib/track.ts`. It does nothing until an analytics provider is added; none is installed |

## 11. Landing page teaser
- A section after the features: **"Can you survive the week? 🐉"**
- An animated d20 plus the Rent Dragon sprite
- **"Play — 2 min"** links to `/play`
- The main sign-up call to action stays above this section, so the game never replaces it

## 12. Build phases
1. **Rules and tuning:** `lib/game` plus tests and the 10,000-run simulation. Tune to about 40% Paladin.
2. **Game screens with placeholder art:** status bar, encounter cards, actions, dice, endings.
3. **Pixel art:** generate with the skill, check it at ×3/×4 scale, clean up by hand.
4. **Polish:** animations, sound, share card, phone layout (one-thumb play).
5. **Landing page teaser + analytics.**

All 5 phases are done. See section 15.

**Estimate:** 3–5 evenings.

## 13. Risks
- **Scope creep:** stay at 7 floors, 8 monsters and 5 spells.
- **The game pulls attention from signing up:** the CTA comes at the end, and the landing page CTA stays first.
- **Balance:** test with the simulation, then with 5 real players.
- **Trademark:** follow the rule at the top.
- **AI pixel art may come out inconsistent:** generate everything with one palette and one size grid, and redraw outliers by hand.

## 14. Phase 1 results (rules + simulation)

**Code (in `web/lib/game/`):**
- `data.ts`: classes, monsters, spells, floor plan, endings
- `engine.ts`: a pure, seeded engine with `newGame`, `actions`, `act`, `afford` ("Can I afford it?") and `endingFor`
- `engine.test.ts`: rule tests
- `simulate.ts` + `simulate.test.ts`: 10,000 seeded runs per class, with the balance range checked in CI

**Win rates** (10,000 runs per class, % of runs):

| Class | Player | Paladin | Ramen | Slain by Rent |
|---|---|---|---|---|
| Scholar | sensible | 35.4 | 64.5 | 0.2 |
| Freelancer | sensible | 47.4 | 24.4 | 28.2 |
| Home Cook | sensible | 40.1 | 59.9 | 0 |
| any | pays for everything | ≈0 | — | 80–100 |

**What the tuning showed:**
- The "sensible player" protects rent, treats themself when it fits, and cancels subscriptions.
- The Freelancer is the high-risk class: about 1 in 4 sensible runs lose to rent.
- The win-rate curves are steep: about 5 gold moves Paladin rates by 15–30 points. Retune after playtests with real people, not just the simulation.

**Rule changes from the original design** (already applied above):
- The Slime is now a real recurring subscription: resisting cancels it, and you can't flee it.
- Paying the Imp keeps morale rather than raising it.
- New ending: Lonely Miser.
- Starting gold is now 95 / 60 / 115 and the Freelancer's pay is 25.

## 15. Phases 2–5 results

**What shipped:**
- `/play` page: class select, then the board (stats, scene, encounter card with "Can I afford it?", actions, a spells menu, and a story log read out to screen readers), then the ending.
- The real sprites, at whole-number scales (×2 on phones, ×4 on desktop), with a 2-frame idle animation.
- Dice tumble, floating `−$` / `+$` numbers, monster transitions, and optional WebAudio sound.
- Share card: a 1200×630 canvas image. It opens the system share sheet where image sharing is supported, and downloads otherwise.
- The last title earned is remembered in localStorage.
- Landing page teaser `components/PlayTeaser.tsx`, placed between Wrapped and Privacy.

**Checked:**
- 53 tests, lint, typecheck, and a static `next build`.
- Full runs at 1440px and 375px, plus the board at 768px.
- No horizontal scroll, and all tap targets are at least 44px.

**Not checked yet:**
- The reduced-motion path (instant resolve, no dice tumble).
- `navigator.share` on a real phone. In the browser pane it fell back to download.
- Sound output.
