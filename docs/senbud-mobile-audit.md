# Senbud mobile: framework and implementation audit

Decision: **Expo (React Native) plus a shared TypeScript core**, published to the App Store and Google Play.
Researched 16 October 2026. Sources are official docs, release pages and store policies, accessed on that date. Items marked **UNVERIFIED** were not confirmed and need checking before relying on them; **PRO** means ask a lawyer or tax adviser. This is not legal advice.

---

## Verdict

The choice is sound. Expo SDK 58 is current and mature enough for this app, and it happens to pin the same React version as the website, which makes a shared core straightforward. The risky parts are not the framework. They are:

1. **Payments.** Inside the iOS and Android apps, Pro has to be sold through Apple's and Google's in-app purchases. A Polar licence key that unlocks Pro in the iOS app breaks App Store rule 3.1.1.
2. **Styling.** The Tailwind library for React Native (NativeWind) is only stable on Tailwind 3. Its Tailwind 4 version is still a release candidate. **Phase 0 result:** v5 rc works on SDK 58 but only with a repo-wide `lightningcss` pin, so start with `StyleSheet` plus shared tokens (see [Phase 0 results](#phase-0-results-16-october-2026)).
3. **Google Play's new-developer gate.** A new personal account must run a closed test with at least **12 testers for 14 days in a row** before it can publish. Plan for this early.
4. **Brand-new SDK.** SDK 58 shipped on 15 October 2026. Some libraries may lag for a few weeks.

---

## 1. Platform: Expo SDK 58

| Item | Current state | Source |
|---|---|---|
| Expo SDK | **58.0.0**, released 2026-10-15. React Native 0.88, **React 19.3.0** (same as `web/`) | docs.expo.dev/versions/latest |
| Release cadence | About three SDKs a year | same |
| New Architecture | Mandatory since SDK 55; can't be turned off | docs.expo.dev/guides/new-architecture |
| Minimum OS | iOS 16.4+, Android 7+ | docs.expo.dev/versions/latest |
| Node | 22.13+ (you have 24) | same |
| Expo Router | Part of SDK 58. Typed routes are beta (`experiments.typedRoutes`). Since SDK 56, import navigation only from `expo-router`, not `@react-navigation/*` | docs.expo.dev/router |
| Expo Go | Fine for early UI work. Purchases, widgets, remote push, SQLCipher and custom native code need a **development build** (`expo-dev-client`). Expo Go now requires logging in (from the changelog headline only, **UNVERIFIED**). | docs.expo.dev/develop/development-builds |

**Recommendation:** start on SDK 58. The project is new, so there's nothing to migrate. Run `npx expo install --check` after adding each library, since a library may not yet support RN 0.88. Plan to work in a development build from week one, because payments and widgets need one.

**Apple build requirement:** builds uploaded since 2026-04-28 need Xcode 26 or later. EAS Build handles this on its servers.

---

## 2. Monorepo and the shared core

### Layout
```
Senbud/
├── package.json            ← npm workspaces: ["web", "mobile", "packages/*"]
├── packages/core/          ← @senbud/core: pure TypeScript, no React, no DOM
│   ├── src/                  parser, budget maths, safe-to-spend, split, money, types
│   └── src/*.test.ts         Vitest
├── web/                    ← Next.js 16 (exists)
├── mobile/                 ← Expo SDK 58 app (new)
└── api/                    ← Laravel 13 (exists, not part of the JS workspace)
```

### Findings
- **npm is fine.** Expo's monorepo guide supports npm, Yarn, pnpm and Bun, and recommends none in particular. Keep npm.
- **Metro configures itself for monorepos** since SDK 52. Don't add `watchFolders` or other resolver settings by hand.
- **Avoid two copies of React.** `web/` and Expo both use React 19.3 today. Pin `react` and `react-dom` with a root `overrides` field, and check with `npm why react`. If web upgrades React before Expo does, this is the first thing to break.
- **Using the core without a build step:** point `packages/core/package.json` `main` (and `exports`) at `src/index.ts`. Metro compiles TypeScript from workspace packages. On the web side, Next.js probably needs `transpilePackages: ["@senbud/core"]`. **Proven in Phase 0:** Metro bundles the TypeScript source with no extra config, and Next 16.4 needs only `transpilePackages: ["@senbud/core"]`.
- **Next.js and the root lockfile.** Moving to workspaces creates a root `package-lock.json`. In Phase 0 Next showed no multiple-lockfile warning, so `turbopack.root` wasn't needed. The planned `web/` Docker build still has to copy `packages/core` and the root lockfile.

### What moves from `web/lib/demo.ts` into the core, and what has to change

| Function | Moves as-is? | Change needed |
|---|---|---|
| `parseSpending`, `categorize` | Mostly | **Hermes risk:** the parser uses a regex lookbehind `(?<!…)` and Unicode classes `\p{L}`. **Phase 0: both work in Hermes** (RN 0.88), and parser output matches Node exactly, so no rewrite is needed. Category words need an extensible list for user-defined categories. |
| `afford`, `hoursOfWork` | Yes | None |
| `splitBill` | No | People are hard-coded as types (`"You" \| "Jordan" \| "Sarah"`). Make people a generic list of IDs. |
| `money` | No | Hard-codes USD and `en-US`. Take currency and locale as arguments. **Phase 0:** done. Hermes `Intl` matches Node for `en-US`, `en-MY` and `de-DE`, but `ms-MY` differs on iOS (`RM12` vs Node's `RM 12`). Don't snapshot formatted strings across platforms. |
| Safe-to-spend, rent countdown, treat jar, subscription detection | Written in Phase 1 | Done in the core with tests (plus category budgets and IOUs). See the notes under Phase 1 in section 5. |

`web/lib/game/*` (Budget Dungeon) can stay in `web/` for now.

---

## 3. Libraries

| Need | Choice | Status | Notes and risks |
|---|---|---|---|
| **Styling** | **Decided in Phase 0: shared tokens (`@senbud/core/tokens`) plus `StyleSheet`.** Revisit NativeWind v5 when it's stable and lists SDK 58. | NativeWind stable is 4.2.7 but **Tailwind 3 only**. v5 is `5.0.0-rc.0` and needs Tailwind 4.1, the New Architecture and Reanimated 4. Unistyles is 3.5.3 (New Architecture only is inferred, **UNVERIFIED**). | Whichever wins, export colours and spacing from `@senbud/core/tokens` so the web CSS variables and the app share one palette. Don't bet launch on a release candidate without trying it on SDK 58 first. |
| **Animation** | **Reanimated 4.7** + `react-native-worklets` 0.13 | Current; 4.7 targets RN 0.86–0.88 | **Skip Moti.** Its last release was roughly 9 months ago and Reanimated 4 support is unclear. |
| **Gestures** | **react-native-gesture-handler v3** | 3.3.0. v2 stops at RN 0.87, so **RN 0.88 needs v3** | Needed for swipe-to-undo and the bill-split taps |
| **Local data** | **expo-sqlite** | Included in SDK 58 and works in Expo Go. Change listener available. | Optional encryption (SQLCipher) needs a development build |
| **Queries and migrations** | **Drizzle ORM** (`drizzle-orm/expo-sqlite`, `useLiveQuery`) | Drizzle's Expo docs say to install `@rc` / `@next` tags, so the integration isn't on a stable tag yet | If it's still a release candidate when you start, use plain SQL with a numbered migrations array. Your schema is small. |
| **Export and backup** | `expo-file-system` + `expo-sharing` | Included in Expo Go | Keep "Export everything" free, as promised on the landing page |
| **Receipt photos** | **expo-image-picker** (camera or gallery) + **expo-image-manipulator** | Included in Expo Go | Resize to about 1280px JPEG before upload with `manipulate().resize().renderAsync()`; `manipulateAsync` is deprecated. On Android, recover with `getPendingResultAsync`. |
| **Local nudges** | **expo-notifications**, local scheduling | Works in Expo Go | **iOS keeps at most 64 pending notifications.** Schedule about two weeks ahead and reschedule on each app open. Remote push later, through Laravel, needs a development build. |
| **Home-screen widget** (later) | iOS: **`expo-widgets`** (official, SwiftUI via `@expo/ui`). Android: **react-native-android-widget** | Both need a development build. Interactive widgets need iOS 17+. | Phase 3. The "safe to spend today" widget is a strong reason to have a native app at all. |
| **Licence or entitlement cache** | **expo-secure-store** | Included in Expo Go | Values may survive uninstall on iOS but not on Android, so treat the store or RevenueCat entitlement as the source of truth |
| **Unit tests (app)** | **Jest + `jest-expo` + React Native Testing Library 14.1** | RNTL 14.1 added RN 0.88 support | Expo documents Jest, not Vitest. Keep **Vitest for `packages/core`**. |
| **End-to-end tests** | **Maestro** on EAS Workflows | Documented | Flows live in `mobile/.maestro/` |
| **Builds and submit** | **EAS** Build, Submit, Update | Free plan: 15 iOS + 15 Android builds a month, submitting included, 1,000 monthly active users on updates | Free is enough until launch. Starter is $19/month. |

---

## 4. Payments and store rules

### What the rules mean for Senbud
- **App Store 3.1.1:** unlocking Pro *inside the iOS app* must use in-app purchase. Licence keys and other own mechanisms are not allowed. **A Polar licence key that unlocks Pro in the iOS app is high risk of rejection.**
- **US link-outs:** apps on the US storefront may link to web checkout (3.1.1(a)). After Epic v. Apple, Apple may charge only a cost-based fee on these, and no final rate has been set. The Supreme Court is reviewing the contempt finding this term. Treat it as **unsettled** (as of August 2026).
- **3.1.3(b):** people can use on other platforms what they bought in your app, as long as it's also sold in-app.
- **Fees:**
  - **Apple:** the Small Business Program charges 15% if last year's proceeds were $1M or less.
  - **Google Play (US, since 2026-06-30):** a 10% service fee on subscriptions plus 5% for Play Billing.
  - Both are worth checking again in Play Console and App Store Connect before launch.

### Recommended payment design
1. **Inside the apps:** sell Pro through **RevenueCat** (`react-native-purchases`), which uses StoreKit and Play Billing. It's free up to $2,500 of monthly tracked revenue, then 1%. It needs a development build; Expo Go only gets a preview mode.
2. **No accounts:** RevenueCat uses anonymous IDs, and "Restore purchases" works through the person's App Store or Play account.
3. **Web (Polar):** keep web Pro for the **web app only** at launch. RevenueCat has **no Polar integration**. RevenueCat does integrate with Stripe (Redemption Links work without accounts). Stripe's own merchant-of-record service doesn't accept Malaysian sellers, but direct Stripe lists Malaysia (whether individuals qualify is **UNVERIFIED**), and then US sales tax would be your job. Sharing one Pro across web and app means either your own Laravel sync or a later move to RevenueCat Web Billing. **PRO:** check the cross-platform design with a lawyer.
4. **Show subscription terms on the paywall** (price, renewal, links to terms and privacy). The exact wording is **UNVERIFIED**, so check Apple's 3.1.2 checklist.

### Accounts and launch timeline
- **Apple Developer Program:** $99 a year. As an individual you don't need a D-U-N-S number, but **your legal name is shown as the seller**. To show "Senbud" instead you'd need a registered company, which does need D-U-N-S.
- **Google Play:** $25 once, and you must be 18+. ID and card checks may apply; no prepaid cards.
- **Google Play closed testing:** personal accounts created after 2023-11-13 need **at least 12 testers opted in for 14 days in a row**, then a production-access application. Testers who leave and rejoin restart their 14 days. **Recruit 15–20 testers early**, for example from the waitlist.

### Privacy and AI compliance
- **5.1.2(i):** before the first receipt is sent, show a **consent screen** that says the photo goes to Senbud's server and on to an AI provider through OpenRouter, names the provider, and asks permission.
- **Privacy labels:**
  - Apple counts data as "collected" only if it's kept longer than needed to answer the request.
  - So configure Laravel **not to store or log receipt images**, and choose OpenRouter providers with **zero data retention** (OpenRouter's settings are **UNVERIFIED**). Then the Apple label can stay minimal.
  - Google's Data safety form counts any data sent off the device, so declare Photos there.
- **Privacy manifest:**
  - Set `expo.ios.privacyManifests` in `app.json`, giving the reasons for UserDefaults, file timestamps and similar.
  - Check each library's own manifest; Apple emails about missing ones after upload.
- **No account deletion needed** (5.1.1(v)), because there are no accounts. Still add **"Erase all data"** in settings.
- **Money-management rule 3.2.1(viii)** is aimed at institutions that move money. A budgeting tracker likely isn't covered. **PRO** to confirm.
- **Age rating and US age laws:**
  - Apple now rates apps 4+, 9+, 13+, 16+ or 18+.
  - App-store age laws now apply in Texas (new accounts since 2026-06-04), Utah (since 2026-05-06) and Louisiana (since 2026-07-01). Apple (Declared Age Range API) and Google (Play Age Signals API, beta) offer tools for them.
  - With a student audience that may include under-18s, **PRO:** ask whether subscriptions need parental-consent handling.

---

## 5. Implementation plan

### Before Phase 0
- **Another chat is working in `web/`.** Moving `web/` into npm workspaces moves `node_modules` to the root, which breaks its running `next dev` server. Coordinate with it before the spike, and expect a fresh `npm install` for everyone.

### Phase 0: spike (2–3 days). Prove the risky parts before building screens.
1. Root `package.json` with npm workspaces and `overrides` for React. Move `web/` onto it, and confirm `next build` and the tests still pass.
2. Create `packages/core`: move the parser, `afford`, `hoursOfWork`, `money(currency, locale)` and a generic `splitBill`, with their Vitest tests.
3. `npx create-expo-app mobile` on SDK 58, using Expo Router.
4. Import `@senbud/core` in web and mobile.
5. On a real device:
   - check that the parser regex and `Intl` currency formatting behave the same in Hermes as in Node
   - try NativeWind v5 rc against a shared-tokens-plus-StyleSheet version, and pick one
6. Make a development build (`expo-dev-client`) and confirm it installs on both platforms.

**Done when:** one screen in the app uses `@senbud/core` to parse "lunch 12, uber 8", web still builds, and the styling decision is made.

### Phase 0 results (16 October 2026)
Branch `claude/nifty-kalam-3076ea`.

**Status:** done on iOS. Android is built but not run (see the Android row below).

**What exists now**
- **Workspaces.** The root `package.json` sets workspaces `["web", "mobile", "packages/*"]` and overrides `react`/`react-dom` to 19.3.0. There is one root `package-lock.json`, and `web/package-lock.json` is deleted. After merging, every checkout needs a fresh `npm install` at the repo root, because `web/node_modules` is no longer used.
- **`@senbud/core`** (`packages/core`).
  - It contains `parseSpending`, `categorize`, `afford`, `hoursOfWork`, `money(value, currency, locale)` and `splitBill(items, mode, people, payer)`.
  - Leftover cents in `splitBill` go to `payer`.
  - `@senbud/core/tokens` holds the brand colours and spacing.
  - It has 13 Vitest tests.
- **`web/lib/demo.ts`** is now a thin wrapper. It pins USD/`en-US` and the You/Jordan/Sarah cast, so no component changed. `web` passes `next build`, lint and 44 tests.
- **`mobile/`** was created with `create-expo-app --template default@sdk-58`.
  - Without that flag, `create-expo-app@latest` scaffolded **SDK 57**, so pass the template.
  - Template screens are removed.
  - One Stack screen parses "lunch 12, uber 8" with `@senbud/core` and shows Lunch · Food $12, Uber · Transport $8, Total $20.
  - It also renders a temporary engine probe, the JSON that the Hermes table below comes from. Delete it in Phase 1.

**Hermes vs Node** (Node 24.13; Hermes from RN 0.88 in an iOS 27 simulator dev build)

| Check | Node | Hermes iOS | Hermes Android |
|---|---|---|---|
| Lookbehind `(?<=a)b` | ✅ | ✅ | ✅ compiles (`hermesc`); runtime not run |
| `\p{L}` with `u` flag | ✅ | ✅ | ✅ compiles (`hermesc` rejects a bad `\p{…}` name, so it really validates); runtime not run |
| `Array.prototype.at` | ✅ | ✅ | not run |
| `parseSpending("lunch 12, grab 8 and $4.50 kopi; 1,200 rent, café 3, -5 lunch")` | 5 items | **identical** | not run |
| `money` `USD`/`en-US`: 12, 4.5, 1200, 11.999… | `$12` `$4.50` `$1,200` `$12` | identical | not run |
| `money` `MYR`/`en-MY` | `RM 12` (NBSP) | identical | not run |
| `money` `EUR`/`de-DE` | `12 €`, `1.200 €` (NBSP) | identical | not run |
| `money` `MYR`/`ms-MY` | `RM 12` (NBSP) | **`RM12` (no space)** | not run |

**Conclusions**
- **The parser needs no rewrite.** Lookbehind and `\p{L}` work in Hermes, and the output matches Node byte for byte.
- **`Intl` works, but locale data differs between engines.** iOS uses Apple's CLDR, Android uses its own ICU, and Node uses its bundled ICU, so `ms-MY` already differs on iOS.
  - Never compare formatted money strings across platforms in tests.
  - Keep `money` tests on `en-US` in Node.
  - If exact output ever matters (for example, CSV export), format from `formatToParts` or from cents yourself.
- **Android runtime is still open.** Run the same probe on an emulator: open the app and read the `SENBUD_PROBE` line in Metro.

**Styling: NativeWind v5 rc vs shared tokens plus StyleSheet**

The NativeWind trial is kept on branch `claude/nativewind-v5-trial` (not for merge).
- **Installs on SDK 58, but untested by NativeWind.** v5 rc was installed with `nativewind@5.0.0-rc.0`, `react-native-css@3.1.0-rc.0`, Tailwind 4.1.12, `@tailwindcss/postcss` and `postcss`. Its install page lists **SDK 57 / RN 0.86** as the tested target, not 58.
- **First bundle failed** with `failed to deserialize; expected an object-like struct named Specifier`. Cause: npm hoisting gave `react-native-css` the root `lightningcss@1.32.0`, which is web's Tailwind 4.3 version, instead of 1.30.1.
- **The fix is repo-wide.** It needs a root `overrides.lightningcss = 1.30.1`, and npm only honoured it after the `lightningcss` entries were deleted from the lockfile.
- **Web was unaffected by the pin.** Web's Tailwind keeps a nested 1.32.0, and `next build` still passed.
- **Version split.** `nativewind` itself resolved web's `tailwindcss@4.3.3`, not the pinned 4.1.12. It worked, but it's an untested combination.
- **Once pinned, it works on iOS.** It handles custom `@theme` colours, `rounded-2xl`, `flex-row` and arbitrary classes, and Fast Refresh picks up both class edits and new `@theme` variables.
- **It adds about 600 modules to the bundle** (1,276 → 1,879).
- **Not tried on Android.**
- **Decision: shared tokens plus `StyleSheet` for Phase 1.** Reasons:
  - No release candidate on the critical path.
  - No repo-wide pin that any `npm install` or web Tailwind bump can silently undo.
  - No untested Tailwind version mix.
  - Nothing extra in the bundle.
- **What NativeWind would buy** is class-name parity with web. That's small, because the app's screens are new, not ported. The shared palette already lives in `@senbud/core/tokens`.
- **Revisit** when NativeWind v5 is stable and its docs list the current SDK. The trial branch shows the exact setup.

**Dev builds**

| Platform | Result |
|---|---|
| iOS simulator (iPhone 17, iOS 27, Xcode 27) | ✅ `npx expo run:ios` built, installed and loaded the bundle from Metro. CocoaPods first run is slow because it downloads React Native core prebuilts. After install, `expo run:ios` exited on `osascript … "System Events"` (no Automation permission for the terminal) and took Metro down with it. Workaround: run `npx expo start --dev-client` separately and open `exp+senbud://expo-development-client/?url=http://localhost:8090`. |
| Android | Pending: Gradle build was interrupted by the repo move; see below. |

**Other notes**
- **`expo-doctor` false positive:** it reports `ios.icon` `./assets/expo.icon` as missing. It's an Icon Composer folder from the SDK 58 template. Leave it.
- **The bundle id `app.senbud.mobile` is a placeholder.** Pick the real one before the first EAS build.
- **The repo now lives on the external drive "keira".** It's in an APFS sparse image at `/Volumes/keira/Ledgerly.sparsebundle`, mounted at `/Volumes/Ledgerly`, and `~/VS CODE/Ledgerly` is a symlink to it.
  - The drive itself is exFAT, which can't hold the repo directly: no symlinks for npm workspaces, and no executable bits for `gradlew` or `hermesc`.
  - If the image isn't mounted, run `hdiutil attach /Volumes/keira/Ledgerly.sparsebundle`.

### Phase 1: the free app, no network needed
- **Screens:** quick add (type), manual add, receipt list, safe-to-spend dial, rent countdown, budgets, treat jar, bill split with IOUs, CSV export, "Erase all data".
- **Storage:** expo-sqlite (with Drizzle, or plain SQL with numbered migrations).
- **Local nudges:** expo-notifications, rescheduled on every app open because of the iOS 64-notification cap.
- **Logic:** all money maths in `@senbud/core`, tested.

**Core logic choices where the spec is ambiguous** (`packages/core/src/budget.ts`, `dates.ts`, `subscriptions.ts`, `iou.ts`):
- **Units.** New functions take integer cents and `"YYYY-MM-DD"` date strings, done in UTC. The caller passes `today` as the device's local date. The older float helpers (`afford`, `hoursOfWork`, `money`) are unchanged because web uses them.
- **Budget period.** The spec has a single `startDay` field. The core uses a separate shape for each kind instead:
  - week: `startWeekday` (0 = Sunday)
  - month: `startDay` (1–31, clamped in short months)
  - until: `start` and `payday`
- **Period boundaries.** A period runs from `start` up to, but not including, the next start (or payday). Days left counts today, so it is 1 on the last day. A period whose payday has passed also counts as 1 day left.
- **Safe to spend.** It is rounded down to the cent and never below 0. `covered` means `limit − spent − upcoming bills ≥ 0`, and the rent card and treat nudge both use it.
- **Bills that count as upcoming.**
  - A bill due today counts. One due on the next period's first day doesn't.
  - Confirmed subscriptions that renew in the period count too.
  - To stop a paid bill being counted twice (once in spending, once as upcoming), a bill has an optional `paidThrough` date. The app sets it when rent is paid.
- **Month-end due days.** A bill due on the 31st falls due on Feb 28/29, Apr 30, and so on. Due today means 0 days left.
- **Category status.**
  - "close" starts at 90% used, and exactly at the limit is still "close".
  - "over" means more than the limit.
  - With a limit of 0, any spending is "over".
  - The pace warning is a separate check (`aheadOfPace`).
- **Treat jar.** Only end-of-period underspend rolls in (`leftover`). The jar has no rounding up of purchases, because the spec doesn't mention it. Learning treats from repeat purchases isn't built yet.
- **Subscription cadence windows (in days).** Weekly is 6–8, monthly 27–33 and yearly 358–372. "Similar amount" means within 10% of the latest charge.
  - Every charge from that merchant must fit the pattern, so one odd purchase at the same place hides the subscription.
  - Merchants match on lower-cased, trimmed labels.
  - Two charges are enough, as the spec says.
- **IOUs.** Only debts involving the user are stored, with direction `theyOweMe` or `iOweThem`. If a friend paid, the user owes that friend their own share, and what others owe that friend isn't tracked. "Settle up" marks every unpaid IOU with that friend as paid. Stale means unpaid for more than 7 days.

### Phase 2: AI and Pro
- **Receipt snapping:** image-picker, then resize, then Laravel `/v1/agent`, then OpenRouter. Show the consent screen first, keep no image retention, and add rate limits.
- **Paywall and restore purchases:** RevenueCat, using a development build.
- **App store setup:** the privacy manifest and both stores' data forms.
- **Google Play closed test:** 12+ testers for 14 days, started as soon as there's a usable build.

### Phase 3: native extras
- iOS and Android widgets
- Remote push through Laravel and the Expo push service
- Recap share cards

---

## 6. Gaps the audit found
- **The spec contradicts itself.** `docs/senbud-spec.md` section 10 still plans the main app as Next.js `/app/*` with Dexie, Serwist PWA and Web Push. With Expo as the app, those rows are deferred. **Option, not decision:** SDK 58 bundles react-native-web 0.21, so the Expo app could also produce the web version, which would avoid building `/app` twice. The landing page stays in Next.js either way.
- **Mobile analytics is unresolved.** Plausible has no React Native SDK, and `web/lib/track.ts` is web-only. Pick a privacy-respecting option for the app before launch (**UNVERIFIED** which).
- **The AI proxy doesn't exist yet.** Phase 2 depends on Laravel's `/v1/agent` endpoint (OpenRouter proxy, no image retention, rate limits), which hasn't been built.

## 7. Open decisions for you
1. **Styling:** ~~NativeWind v5 or shared tokens plus StyleSheet?~~ Phase 0 recommends shared tokens plus `StyleSheet` (see Phase 0 results). Overrule it if Tailwind class parity with web matters more to you than avoiding the release candidate.
2. **Seller name:** publish as an individual, with your legal name shown on the App Store, or register a company first?
3. **Web Pro:** keep it separate from app Pro at launch (simplest), or build a shared entitlement later?
4. **Age policy:** get advice on under-18 users and subscription consent before launch.
