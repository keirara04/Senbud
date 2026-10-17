# Senbud: build plan after v1

Date: 17 October 2026.

The original build order (spec section 9) is done: every screen in the design system's inventory is built. This plan covers what's left: spec features not built yet, loose ends, and ideas outside the spec. Open design questions stay in design system 4.11 and spec section 11; this file only says which items they block.

Sizes: **S** is a few files and a day or less, **M** is a few days, **L** is a week or more or needs native work. **Pro** marks items on the Pro side of spec section 8.

---

## 1. Before launch (setup, not code)

- **Unlimited AI for the owner:** set `UNLIMITED_KEY` on the API server (`openssl rand -hex 32`) and remove `UNLIMITED_DEVICES`. Put the same value in `EXPO_PUBLIC_UNLIMITED_KEY` only in your own builds. Anything `EXPO_PUBLIC_` ships inside the app, so never in a store build.
- **Mail:** set `MAIL_MAILER` (smtp, postmark, resend or ses) and its credentials in production. The default `log` only writes emails to a file.
- **Google Play closed test:** a new personal account needs 12 testers for 14 days in a row before it can publish (`docs/senbud-mobile-audit.md`). Start it early.
- **Dev machine:** `brew install watchman`. Without it Metro misses edits on the external drive and serves old code.
- **Commit today's work** in four commits: core, mobile, API, web.

## 2. Decisions that block items

Ask each one when its item comes up, not before.

| Decision | Blocks |
|---|---|
| What "multiple budgets" means (several overall budgets? per-category budgets with their own periods?) | 4.3 Multiple budgets |
| Category limits free or Pro (design 4.11 question 3) | Nothing built changes; only the paywall copy |
| Are by-item splits and full Wrapped still Pro (design 4.11 question 6) | 4.4 Year-end Wrapped scope |
| AI through your server or users' own keys (spec 11) | 4.4 AI captions, cost of 4.6 |
| Is the name "Senbud" free (spec 11) | Store listings, domain |

## 3. Phase 1: Reminders (built 17 October 2026, except the pace warning)

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
  - **Pace warning.** It can't be scheduled ahead (tomorrow's spending isn't known). Smallest honest version: when a sync finds `aheadOfPace` true today and none was sent today, schedule one for this evening and store the date. Size S.

## 4. Phase 2 onwards

### 4.1 Quick wins

| Item | What | Size | Pro | Files |
|---|---|---|---|---|
| Add by hand remembers | Pre-select the last category used and show "Repeat: Grab RM 12" (spec 4.1, design 4.2) | S | Free | `add.tsx`, `db.ts` |
| Undo for treat and bill deletes | Same as expenses got today: `restoreTreat` / `restoreBill` like `restoreTransactions`, then the Undo bar instead of the confirm dialog | S | Free | `db.ts`, `treats.tsx`, `budgets.tsx` |
| Activity filters and search | Category chips, "added by Bud", and a search field over labels | S | Free | `activity.tsx` |
| Bud writes without em dashes | One line in the Ask prompt so AI answers follow the same copy rule as the app | S | Free | `api/app/Http/Controllers/AskController.php` |

### 4.2 Until payday (Pro)

- **What:** the third budget period. Core already has the `until` period type; Budgets shows only a lock.
- **First, fix the four core bugs the audit found, with tests:** after payday, `daysLeft` is 1 and the whole budget becomes today's number; before the start date, `daysLeft` counts days that aren't in the period; `compareToLast` compares the period with itself; `aheadOfPace` is true before the start.
- **Then the UI:** a payday date in the Budget sheet (`edit-budget`, the onboarding Budget step), and the Budgets row opening it for Pro users.
- **Size:** M. **Depends on:** nothing. **Files:** `packages/core/src/budget.ts`, `recap.ts`, `budgets.tsx`, `edit-budget.tsx`, `onboarding.tsx`.

### 4.3 Carry-over and multiple budgets (Pro)

- **Carry-over:** "US$12 over. Borrow from next week?" and the reverse, rolling a leftover into the next period instead of the treat jar (spec 4.2). Needs a per-period adjustment stored in `db.ts` and counted in `safeToSpend`. **Size:** M.
- **Multiple budgets:** wait for the decision in section 2. **Size:** L whichever way it goes.

### 4.4 Wrapped

- **Year-end edition (Pro):** the same story pager over a year: total, top category and place, treats, best month, hours of work. **Size:** M. **Files:** `packages/core/src/recap.ts`, `wrapped.tsx`, `share.tsx`.
- **AI captions:** captions are rule-written today. Send only the numbers (never labels) through `/agent/ask`, and add them to the data forms (`docs/senbud-store-data-forms.md`) and "What gets sent". **Depends on:** the proxy decision. **Size:** M.

### 4.5 CSV import

- **What:** import a spending CSV. Reuse the backup file picker (`backup.ts`) and the `importAll` transaction shape; labels go through core's category rules. Bank presets (per-bank column maps) come after. **Size:** M. **Free.**

### 4.6 Budget by chat

- **What:** Bud understands "I only want to spend 100 this week" (spec 4.2): a new `readIntent` kind in core, and a Bud slip that shows the change with a confirm button before saving. **Size:** M. **Free.**

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
- Current tab: yellow in dark, pill behind the icon, filled symbol on iOS. The web's dark accent matches the app.
- Currency switch warns that amounts aren't converted and opens the Budget sheet.
- Activity deletes have Undo.
- Game: a craving you can't afford counts as walking away (morale -1).
