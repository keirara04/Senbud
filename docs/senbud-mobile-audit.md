# Senbud mobile: framework and implementation audit

Decision: **Expo (React Native) plus a shared TypeScript core**, published to the App Store and Google Play.
Researched 16 October 2026. Sources are official docs, release pages and store policies, accessed on that date. Items marked **UNVERIFIED** were not confirmed and need checking before relying on them; **PRO** means ask a lawyer or tax adviser. This is not legal advice.

---

## Verdict

The choice is sound. Expo SDK 58 is current and mature enough for this app, and it happens to pin the same React version as the website, which makes a shared core straightforward. The risky parts are not the framework. They are:

1. **Payments.** Inside the iOS and Android apps, Pro has to be sold through Apple's and Google's in-app purchases. A Polar licence key that unlocks Pro in the iOS app breaks App Store rule 3.1.1.
2. **Styling.** The Tailwind library for React Native (NativeWind) is only stable on Tailwind 3. Its Tailwind 4 version is still a release candidate.
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
| Expo Go | Fine for early UI work. Purchases, widgets, remote push, SQLCipher and custom native code need a **development build** (`expo-dev-client`). Expo Go now requires logging in. | docs.expo.dev/develop/development-builds |

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
- **Using the core without a build step:** point `packages/core/package.json` `main` (and `exports`) at `src/index.ts`. Metro compiles TypeScript from workspace packages. Next.js needs `transpilePackages: ["@senbud/core"]`. The Expo guide doesn't cover TypeScript-source packages, so this is **UNVERIFIED** and is the first thing to prove in the spike.
- **Next.js and the root lockfile.** Moving to workspaces creates a root `package-lock.json`. Set `turbopack.root` in `web/next.config.ts` so Next picks the right root, and change the planned `web/` Docker build to copy `packages/core` too.

### What moves from `web/lib/demo.ts` into the core, and what has to change

| Function | Moves as-is? | Change needed |
|---|---|---|
| `parseSpending`, `categorize` | Mostly | **Hermes risk:** the parser uses a regex lookbehind `(?<!…)` and Unicode classes `\p{L}`. Whether Hermes, React Native's JS engine, supports both is **UNVERIFIED**. Either rewrite these two spots without them (small) or prove them in the spike with a test that runs in the app. Category words need an extensible list for user-defined categories. |
| `afford`, `hoursOfWork` | Yes | None |
| `splitBill` | No | People are hard-coded as types (`"You" \| "Jordan" \| "Sarah"`). Make people a generic list of IDs. |
| `money` | No | Hard-codes USD and `en-US`. Take currency and locale as arguments. Hermes `Intl` currency formatting is **UNVERIFIED** on both platforms; test it in the spike. |
| Safe-to-spend, rent countdown, treat jar, subscription detection | Not written yet | Write them in the core, with tests, before any app screens. They're the product's brain. |

`web/lib/game/*` (Budget Dungeon) can stay in `web/` for now.

---

## 3. Libraries

| Need | Choice | Status | Notes and risks |
|---|---|---|---|
| **Styling** | **Decide in the spike:** NativeWind v5 (Tailwind 4, release candidate) **or** shared design tokens plus `StyleSheet` / Unistyles 3 | NativeWind stable is 4.2.7 but **Tailwind 3 only**. v5 is `5.0.0-rc.0` and needs Tailwind 4.1, the New Architecture and Reanimated 4. Unistyles is 3.5.3 and New Architecture only. | Whichever wins, export colours and spacing from `@senbud/core/tokens` so the web CSS variables and the app share one palette. Don't bet launch on a release candidate without trying it on SDK 58 first. |
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
3. **Web (Polar):** keep web Pro for the **web app only** at launch. RevenueCat has **no Polar integration**. RevenueCat does integrate with Stripe (Redemption Links work without accounts), but Stripe's own merchant-of-record service doesn't accept Malaysian sellers. Sharing one Pro across web and app means either your own Laravel sync or a later move to RevenueCat Web Billing. **PRO:** check the cross-platform design with a lawyer.
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

### Phase 1: the free app, no network needed
- **Screens:** quick add (type), manual add, receipt list, safe-to-spend dial, rent countdown, budgets, treat jar, bill split with IOUs, CSV export, "Erase all data".
- **Storage:** expo-sqlite (with Drizzle, or plain SQL with numbered migrations).
- **Local nudges:** expo-notifications, rescheduled on every app open because of the iOS 64-notification cap.
- **Logic:** all money maths in `@senbud/core`, tested.

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

## 6. Open decisions for you
1. **Styling:** NativeWind v5 (release candidate, closest to your web Tailwind) or shared tokens plus StyleSheet/Unistyles (no release-candidate risk)? Decide after the spike.
2. **Seller name:** publish as an individual, with your legal name shown on the App Store, or register a company first?
3. **Web Pro:** keep it separate from app Pro at launch (simplest), or build a shared entitlement later?
4. **Age policy:** get advice on under-18 users and subscription consent before launch.
