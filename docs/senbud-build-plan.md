# Senbud: build plan after v1

Date: 17 October 2026.

The original build order (spec section 9) is done: every screen in the design system's inventory is built. This plan covers what's left: spec features not built yet, loose ends, and ideas outside the spec. Open design questions stay in design system 4.11 and spec section 11; this file only says which items they block.

Sizes: **S** is a few files and a day or less, **M** is a few days, **L** is a week or more or needs native work. **Pro** marks items on the Pro side of spec section 8.

---

## 1. Before launch (setup, not code)

- **Unlimited AI for the owner:** set `UNLIMITED_KEY` on the API server (`openssl rand -hex 32`) and remove `UNLIMITED_DEVICES`. Put the same value in `EXPO_PUBLIC_UNLIMITED_KEY` only in your own builds. Anything `EXPO_PUBLIC_` ships inside the app, so never in a store build.
- **Mail:** set `MAIL_MAILER` (smtp, postmark, resend or ses) and its credentials in production. The default `log` only writes emails to a file.
- **Google Play closed test:** a new personal account needs 12 testers for 14 days in a row before it can publish (`docs/senbud-mobile-audit.md`). Start it early.
- **AI consent date:** set `AI_CONSENT_SINCE` in `mobile/src/db.ts` to the release date of the first build with the 18 Oct 2026 consent text (memory and tools), so anyone who agreed to the old text on an older build is asked again.
- **Dev machine:** `brew install watchman`. Without it Metro misses edits on the external drive and serves old code.
- **Commit today's work** in four commits: core, mobile, API, web.

## 2. Decisions that block items

Ask each one when its item comes up, not before.

| Decision | Blocks |
|---|---|
| What "multiple budgets" means | Decided 17 Oct 2026: per-category periods |
| Category limits free or Pro (design 4.11 question 3) | Decided 18 Oct 2026: free. A limit with its own week or month stays Pro |
| Are by-item splits and full Wrapped still Pro (design 4.11 question 6) | Decided 18 Oct 2026: full Wrapped stays Pro (now on the paywall); by-item splits are free. By item still needs a receipt photo, which is Pro, to list the items |
| AI through your server or users' own keys (spec 11) | Decided 17 Oct 2026: your server |
| Is the name "Senbud" free (spec 11) | Decided 18 Oct 2026: store name "Senbud - Budget Tracker" ("Senbud" alone is taken in the store). A web search found no other app called Senbud; a trademark search is still to do |

## 3. Phase 1: Reminders (built 17 October 2026, pace warning 18 October)

**Why first:** the paywall sells "subscription reminders", and rent due, renewals and the pace warning only show inside the app today. A reminder app that can't remind is the biggest gap.

**Shape:** every trigger is worked out on the phone (rent due date, renewal date, period reset, pace), so this is local scheduled notifications, not remote push. No server, nothing leaves the device, and "What gets sent" stays true unchanged.

- **What:** schedule local notifications for rent and bills (the day before and on the day), confirmed subscription renewals (the day before, Pro), "your budget resets tomorrow", and at most one pace warning a day. Reschedule all of them whenever the money data changes (one `syncReminders()` called after every write, like `reload()`).
- **Settings:** a "Reminders" group with one switch per kind, off until the user agrees. Ask for permission the first time a switch is turned on, not at launch.
- **Size:** M. **Free** for rent, bills and reset; **Pro** for renewals (spec 8).
- **Depends on:** `expo-notifications`. Read `docs.expo.dev/versions/v58.0.0/sdk/notifications` before starting (mobile/AGENTS.md: Expo APIs change every SDK). It needs a development build, which the app already uses (`expo-dev-client`). Web has no scheduled notifications; skip it there.
- **Likely files:** new `mobile/src/reminders.ts`, `mobile/src/money.ts` (call after writes), `settings.tsx`, `db.ts` (switch states in `app`), `app.json` (plugin).
- **Check:** core functions that produce the schedule (dates and texts) get unit tests in `packages/core`; the native part is checked on a device.
- **Built:** `packages/core/src/reminders.ts` (`reminderSchedule`, tested), `mobile/src/reminders.ts` (`allowReminders`, `syncReminders`: cancel all, then schedule up to 48 for the next two months, under iOS's limit of 64), migration 10 (`app.reminders`, not in backups since permission belongs to the phone), the Settings group, and the `expo-notifications` plugin with remote notifications off. `syncReminders` runs on every `useMoney` reload, after each switch and after Erase.
- **Still to do:**
  - **Check on a phone.** It needs a new development build (`npx expo run:ios` / `run:android` or `eas build --profile development`), because `expo-notifications` is native. Turn a switch on, set rent due tomorrow, and see the 7 pm notice.
  - **Pace warning (built 18 October 2026).** A "Spending ahead of pace" switch. `reminderSchedule` takes this period's spending and budget and, when spending runs ahead of pace, schedules one notice for 6 pm today ("SGD 70 of SGD 100 gone and it's only Wednesday", or "SGD 8 left. Cook tonight?"). Quiet when on pace (even close to the limit at the end of a period) or already over. No stored date: spending only changes in the app, every change reschedules, and a past 6 pm is skipped, so it's at most one a day and right as of the last add. Tested in core; not checked on a phone.

## 4. Phase 2 onwards

### 4.1 Quick wins (built 17 October 2026)

All four are in. Bud's adds are now saved with `source: 'bud'` (older ones stay `text`, so they don't count as Bud's). Activity shows an "Added by Bud" chip when there are any; the "Added by Bud" mark on a row shows only while that chip is on.

- Add by hand: the last category was already pre-selected; "Repeat: Grab SGD 12" now adds the last expense again in one tap (shown until an amount is typed).
- Treat and bill deletes: straight away with Undo. `deleteRow` / `restoreRow` in `db.ts` bring back the whole row; `useUndo` in `ui.tsx` holds it (Activity uses it too), and `Screen` takes an `overlay` so the bar shows however far the page scrolls.
- Activity: a search field over labels, and category chips (only categories that have spending).
- Bud: the prompt asks for no em dashes, and the API turns any that slip through into commas (tested).


| Item | What | Size | Pro | Files |
|---|---|---|---|---|
| Add by hand remembers | Pre-select the last category used and show "Repeat: Grab RM 12" (spec 4.1, design 4.2) | S | Free | `add.tsx`, `db.ts` |
| Undo for treat and bill deletes | Same as expenses got today: `restoreTreat` / `restoreBill` like `restoreTransactions`, then the Undo bar instead of the confirm dialog | S | Free | `db.ts`, `treats.tsx`, `budgets.tsx` |
| Activity filters and search | Category chips, "added by Bud", and a search field over labels | S | Free | `activity.tsx` |
| Bud writes without em dashes | One line in the Ask prompt so AI answers follow the same copy rule as the app | S | Free | `api/app/Http/Controllers/AskController.php` |

### 4.2 Until payday (Pro) (built 17 October 2026)

- **Core:** one change in `periodRange` fixed all four audit bugs: an until period repeats at its own length (payday minus start), and a date before the start falls in an earlier one, so today is always inside its period. Tests for each bug, plus a fifth found on the way: Wrapped treated an until limit as monthly; now it's scaled like a weekly one. Until periods now also get the leftover offer and "budget resets tomorrow" reminders.
- **API:** `/agent/ask` accepted only week and month (an until user would get a 422); it now takes `until` and calls it "pay period" in the prompt. Tested.
- **App:** migration 12 (`budget.start_date`, `budget.payday`; 11 is usage stats), the Budget sheet's Week / Month / Until payday choice with a payday day picker, "until 27 Oct" and "pay period" wording on Home, Budgets, Settings, Can I afford it?, Bud and the leftover sheet, and Home's "Payday was ... When's the next one?" card.
- **Choice made:** after payday, the budget repeats at the same length until a new payday is set (the alternative, a paused state, would leave every number undefined). Payday is picked as a day of the month, so it's at most a month away; a longer gap would need a date picker.
- **Not checked:** payday actually passing (the core tests cover it; the browser can't move the clock), and native screens.


- **What:** the third budget period. Core already has the `until` period type; Budgets shows only a lock.
- **First, fix the four core bugs the audit found, with tests:** after payday, `daysLeft` is 1 and the whole budget becomes today's number; before the start date, `daysLeft` counts days that aren't in the period; `compareToLast` compares the period with itself; `aheadOfPace` is true before the start.
- **Then the UI:** a payday date in the Budget sheet (`edit-budget`, the onboarding Budget step), and the Budgets row opening it for Pro users.
- **Size:** M. **Depends on:** nothing. **Files:** `packages/core/src/budget.ts`, `recap.ts`, `budgets.tsx`, `edit-budget.tsx`, `onboarding.tsx`.

### 4.3 Carry-over and multiple budgets (Pro)

**Carry-over built 17 October 2026:** `carryovers` table (migration 13, in backups, cleared by Erase), `useMoney` exposes `limit` (set amount plus carry-over) and `carry`; Home's "Borrow SGD 12 from next week" when over, the leftover sheet's "Add it to this month" for Pro, and the Budgets caption. Checked in the browser with Pro forced on. A borrow is capped at what next period's budget still has, so it never goes below zero. Known limits: moving an until-payday budget's payday after borrowing loses the borrow (its next period starts on another day); Wrapped and Bud's under-budget streak use the set amount, not the carried-over one. **Multiple budgets built 17 October 2026, as per-category periods (decided: one overall budget, category limits with their own period):** the limit sheet has "Resets: With budget / Weekly / Monthly" (Weekly and Monthly are Pro; weeks start Monday, months on the 1st). Migration 14 adds `category_limits.period`. Core's `categoryRange` picks the range; Bud's category nudges and the Budgets rows ("SGD 6.50 of SGD 20 this week") use it, counting from history since a week can start before the budget's month. Tested in core and in the browser with Pro forced on.

- **Carry-over:** "US$12 over. Borrow from next week?" and the reverse, rolling a leftover into the next period instead of the treat jar (spec 4.2). Needs a per-period adjustment stored in `db.ts` and counted in `safeToSpend`. **Size:** M.
- **Multiple budgets:** wait for the decision in section 2. **Size:** L whichever way it goes.

### 4.4 Wrapped (built 17 October 2026)

- **Year-end edition (Pro):** `/wrapped?year=2026`. Core's `wrapped()` takes any range now (`yearRange`; a monthly budget counts once per month) and adds `bestMonth`, the finished month that spent least. A "2026 so far" row heads Budgets' Wrapped list (last year's during January), marked Pro for free users, who get one page pointing at the plans. Share takes the year too.
- **AI captions (through your server, decided 17 Oct):** `POST /v1/agent/caption` (`CaptionController`, tested) takes numbers only (share used, top category as one of the six fixed names, its share, kept or over, treats, streak) and returns one line per page; em dashes and markdown are stripped and every page must be there, or it's a 502. Own rate limit (3 a minute, 20 a day per device). The app asks once per story, only with AI on and the "Bud uses AI" agreement given, and keeps its rule-written lines on any failure. "What gets sent" and `docs/senbud-store-data-forms.md` list it.
- **Not checked:** a real caption (no OpenRouter key locally); the fallback was checked in the browser. Captions run for free users too; make them Pro if the cost shows.


- **Year-end edition (Pro):** the same story pager over a year: total, top category and place, treats, best month, hours of work. **Size:** M. **Files:** `packages/core/src/recap.ts`, `wrapped.tsx`, `share.tsx`.
- **AI captions:** captions are rule-written today. Send only the numbers (never labels) through `/agent/ask`, and add them to the data forms (`docs/senbud-store-data-forms.md`) and "What gets sent". **Depends on:** the proxy decision. **Size:** M.

### 4.5 CSV import (built 17 October 2026)

- Settings, Your data: "Import spending (CSV)". Core's `fromCsv` (`packages/core/src/csv.ts`, tested) reads Senbud's own export and bank statements: columns by header name (date; description, details, merchant...; amount, or debit / money out), commas or semicolons, quotes, a BOM, "RM 1,234.50", "(8.40)", "12,50". Only money out comes in: with a signed amount column, positives are income and skipped; with debit and credit columns, only debits. Day or month first is settled by the file when any day is over 12, otherwise by the locale (month first only for en-US).
- Rows already there (same date, amount and label) are skipped, so importing a statement twice adds nothing. A confirm shows the count, date range, currency and what was skipped first. Imports save as `source: 'csv'`; categories come from the core rules, which now know delivery apps ("GRAB*FOOD" is Food), bubble tea chains, kopitiams and fast food.
- Checked in the browser with a bank-style file: 3 added, the salary skipped, a second import "Nothing new to add". Not checked: the native file picker.
- Later: bank presets, and a currency column that differs from the profile (amounts are taken as the profile's currency today).


- **What:** import a spending CSV. Reuse the backup file picker (`backup.ts`) and the `importAll` transaction shape; labels go through core's category rules. Bank presets (per-bank column maps) come after. **Size:** M. **Free.**

### 4.6 Budget by chat (built 17 October 2026)

- Core's `readIntent` has a `budget` kind: "I only want to spend 100 this week", "set my budget to 1,200 a month", "budget is 600 until payday", "change my budget to 300" (keeps the period). "200 on food this month" or "no more than 30 on treats" is a category limit. "20 on bubble tea" names a place, not a category, so it goes to Bud as a question and never becomes an expense. Tested.
- Bud prints a "New budget?" slip with Now and New, and what that leaves for the rest of the period, then Keep it or Set it. Nothing saves before Set it; Undo puts it back. Home sends these lines to Bud too.
- Free for a week or a month. Until payday is Pro and needs a payday, so Bud opens the Budget sheet when the budget isn't until payday already. A category limit with its own week or month is Pro; free limits reset with the budget, and the slip says so.
- Checked in the browser: week, month with Undo, a treat limit, a place, and with Pro until payday and a weekly Transport limit on an until budget.

### 4.6b Malay and bahasa pasar input (built 18 October 2026)

- Quick add and Bud's rules read Malay, bahasa pasar and the Malay-English mix: "roti canai 1.50 dan teh ais 2.50", "rm5", "8 hinggit", "50 sen", "1.2k", Malaysian food, drinks, stores, transport, telcos and bills. Every Bud intent has Malay forms ("boleh ke aku beli kasut 80", "brp hari lg gaji", "bajet 1k sampai gaji", "limit makan 200", "split dgn ali n abu"), and Malay questions never become expenses. `categoryNamed` (core) maps "makan", "jajan", "barang dapur" to categories. Bud's AI replies in the language the user writes in.
- A vocabulary audit of 285 lines went from 113 wrong to 19; all 19 are left out on purpose.
- Also left out: "limit grab 100" (a place, so Bud takes it), per-day budgets ("jgn lebih 20 sehari" goes to Bud), and PTPTN or scholarship payout dates (not a pay period).
- Left out on purpose: bare "air", "reload"/"top up", "data", "yes", "pasar", "7e", "texas", "motor", "steam" (each collides with another meaning); number words (seringgit, lima ringgit, kupang, suku); "sewa"/"rent" stay Other (decided 18 Oct 2026: rent is tracked as a bill, so typed rent stays Other); "x jadi beli" (negation); "teh 2 ke" (a trailing "ke" after an amount).
- Still English: every screen, Bud's slips, notifications, the off-topic reply and Wrapped captions. A full Malay app is a separate, larger job.

### 4.7 Later or parked

| Item | Notes | Size |
|---|---|---|
| Home-screen widget with safe-to-spend | iOS WidgetKit and Android app widget through a config plugin and a dev build | L |
| "Hey Siri, log kopi" | App Intents / Shortcuts | L |
| "Still using Netflix?" prompt | Optional in spec 4.10 | S |
| Encrypted sync between phones | Spec 8, "later" | L |
| Bank sync | Spec 11, decide after launch | L |

The pay-day reminder from the earlier list is part of Phase 1 ("your budget resets tomorrow").

## 5. Done on 17 October 2026

- Audit fixes across core, mobile, API and web: rent counted for the whole period (bills have a start date), Home and Wrapped agree, today's allowance drops with today's spending (spec 4.4 updated), split comma decimals, receipt total and currency-scaled caps, double-tap protection, deletes, Pro after Erase, unlimited key header, waitlist re-click, hashed rate-limit keys, web form messages, reduced motion and game fixes.
- Examples follow the currency: local words and prices (`packages/core/src/examples.ts`), quick picks scaled, the quick-add parser takes large amounts and "150.000" in currencies without decimals, the amount pad allows 9 digits there.
- Home: today's receipt and "Again" chips fill the empty space.
- Current tab: yellow in dark, filled symbol on iOS (the pill behind the icon was tried, then removed). The web's dark accent matches the app.
- Currency switch warns that amounts aren't converted and opens the Budget sheet.
- Activity deletes have Undo.
- Game: a craving you can't afford counts as walking away (morale -1).
