# Senbud app design system

**Applies to:** the Expo app (`mobile/`).

**Where the code lives:**
- Tokens: `packages/core/src/tokens.ts`, imported as `@senbud/core/tokens`.
- Components: `mobile/src/ui.tsx`.

**Where it comes from:** the landing page brand in `web/app/globals.css`. Change both together.

---

## 1. Idea

Senbud looks like **stationery**:
- a dotted notebook (the background)
- a cobalt pen (panels, buttons, links)
- a yellow highlighter (the one number that matters)
- a thermal receipt (anything that's money you spent)

It should feel like a friend's notebook, not a bank.

**Rules that follow from that:**
1. **One loud thing per screen.**
   - The highlighter colour is for the key number or phrase only: safe to spend on Home, the jar total on Treats.
   - If two things are yellow, neither stands out.
2. **One cobalt panel per screen at most.** It holds the screen's answer. Everything else sits on plain surface cards.
3. **Numbers before words.** Big tabular figures, with a one-line plain sentence under them.
4. **Calm by default.**
   - Nothing red or alarming while you're on track.
   - When you're not, the copy is kind ("no stress"), never scolding.
5. **System fonts and native controls.** SF Pro on iOS, Roboto on Android. No custom fonts to download. Native navigation headers, alerts and keyboards.

## 2. Tokens

There are three layers. Screens use only the top two, through `useTheme()` and the components:
- **palette:** raw hex values. Never use these in screens.
- **themes.light / themes.dark:** what each colour is *for*.
- **components:** in `ui.tsx`.

### 2.1 Theme colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#f5f6fa` paper | `#0b1033` night | Screen background |
| `surface` | `#ffffff` | `#131a4a` | Cards, inputs |
| `surfaceSunken` | `#e6e8f0` | `#1c2560` | Progress tracks, segmented control, pressed rows |
| `text` | `#1a1c2e` | `#eef0ff` | Body text |
| `textDim` | `#565b75` | `#a8b0d8` | Secondary text, labels |
| `line` | ink 12% | white 10% | Borders, dividers |
| `accent` / `accentPressed` / `onAccent` | cobalt / cobaltDeep / `#f4f6ff` | periwinkle `#c9d2ff` / `#b3bff5` / ink | Links, selected states. Dark is periwinkle, so the hero number and the `highlight` button stay the only yellow (17 Oct 2026). The web's `globals.css` matches, with `--tab-active` for the current tab. |
| `tabActive` | cobalt | highlighter `#eeff5a` | The current tab's icon and label. Yellow in dark on purpose: the clearest "you are here" cue, even while a screen is still drawing (17 Oct 2026). The one yellow allowed outside the key number. |
| `placeholder` | `#878ca3` | `#666e9e` | Input placeholder, dimmer than `textDim` so it never reads as a filled-in value |
| `primary` / `primaryPressed` / `onPrimary` | cobalt / cobaltDeep / `#f4f6ff` | periwinkle `#c9d2ff` / `#b3bff5` / ink | Primary button fill. Its own token so in dark mode the one `highlight` button stays the only yellow (decided 16 Oct 2026). |
| `panel` / `onPanel` / `onPanelDim` | cobalt / `#f4f6ff` / `#c9d2ff` | same | The hero card. It stays cobalt in dark mode, as on the web. |
| `highlight` / `onHighlight` | `#eeff5a` / ink | same | Key number, marker, highlight button |
| `good` / `goodFill` | `#155a44` / `#4fd1a5` | `#4fd1a5` / same | "On track" text / fill |
| `warn` / `warnFill` | `#8a5a00` / `#f5c542` | `#f5c542` / same | "Close" text / fill |
| `bad` / `badFill` | `#9e2f22` / `#ff6b5b` | `#ff8a7d` / `#ff6b5b` | Over budget, destructive actions |

**Text inks vs fills.** Brand coral (`#ff6b5b`) and mint (`#4fd1a5`) are **fills only** in light mode. As text on white they fail contrast (2.8:1 and 1.9:1). Text uses the `*Ink` versions.

### 2.2 Contrast (WCAG 2.2; AA needs 4.5:1 for body text)

| Pair | Ratio |
|---|---|
| ink on paper | 15.6 |
| inkDim on paper | 6.2 |
| inkDim on white | 6.7 |
| highlighter on cobalt (hero number) | 6.9 |
| onPanel on cobalt | 7.1 |
| onPanelDim on cobalt | 5.1 |
| cobalt on white (links) | 7.6 |
| coralInk on white | 7.3 |
| mintInk on white | 8.2 |
| dark: text on night | 16.3 |
| dark: textDim on night2 | 7.7 |
| dark: coralLight on night2 | 7.2 |
| dark: mint on night2 | 8.6 |
| dark: ink on periwinkle (primary button) | 11.3 |
| dark: cobalt on moon (`UndoBar` action) | 6.7 |
| category chips (tint + ink) | 4.97–7.8 |

### 2.3 Category colours

Category chips use a tint background with ink text, the same pairs the web's bill split uses. They are identical in both schemes.

| Category | Background | Text |
|---|---|---|
| Food | coral tint `#ffd6cf` | `#9e2f22` |
| Transport | blue tint `#e1e7fb` | `#1f3fd8` |
| Treat | highlighter `#eeff5a` | `#4a5000` |
| Groceries | mint tint `#c4efdd` | `#155a44` |
| Subscription | violet tint `#ece6ff` | `#5b3fb8` |
| Other | grey `#e6e8f0` | `#3d4256` |

Charts (Wrapped, budgets by category) use the same six colours, with the **text** colour as the bar fill. That gives one colour per category everywhere.

### 2.4 Type

Fonts are SF Pro (iOS) and Roboto (Android). Sizes are in points. Tracking tightens as size grows. Every amount uses tabular figures (`<T money>`) so columns line up and numbers don't jitter.

| Variant | Size / line | Weight | Use |
|---|---|---|---|
| `hero` | 52 / 58 | 800, −1.4 | Safe to spend today, the jar total. One per screen. |
| `title` | 28 / 34 | 700, −0.6 | Screen intro headings (setup, empty states) |
| `heading` | 20 / 26 | 700, −0.3 | Card titles |
| `body` | 17 / 24 | 400 | Everything else |
| `bodyStrong` | 17 / 24 | 600 | Amounts in lists, button labels |
| `caption` | 14 / 19 | 400 | Supporting lines, dates, errors |
| `label` | 12 / 16 | 700, +0.6, uppercase | Section and field labels |

Dynamic Type and font scaling stay on (React Native's default). Layouts must survive 200% text: rows wrap and nothing has a fixed height except progress tracks.

### 2.5 Space, shape, touch, motion

- **Space** uses a 4-point grid: `xxs 2`, `xs 4`, `sm 8`, `md 16` (screen gutter and card padding), `lg 24`, `xl 32`, `xxl 48`.
- **Radius:** `sm 8` (inputs, buttons), `md 16` (cards), `lg 24` (sheets), `pill` (chips, tracks).
- **Touch:** every tappable thing is at least **48×48** (Apple asks for 44pt, Material for 48dp, so 48 passes both). Small icons use `hitSlop`.
- **Motion:**
  - Durations: `fast 150`, `base 250`, `slow 450` ms.
  - Ease: `cubic-bezier(0.22, 0.68, 0.14, 1)`, the web's highlighter curve.
  - Motion explains a change: Undo sliding in, a number updating. It is never decoration.
  - Reanimated layout animations follow the OS **Reduce Motion** setting, so they just appear.
- **Elevation:** none. Cards are flat colour on paper, like the web. Use shadows only for things that float over content, such as Bud in the tab bar and bottom sheets.

## 3. Components (`mobile/src/ui.tsx`)

| Component | Variants and props | States and rules |
|---|---|---|
| `Screen` | `scroll` (default true) | Paper background, 16 pt gutter, `contentInsetAdjustmentBehavior="automatic"` so content clears the header. Keyboard taps persist. |
| `T` | `variant` (type scale), `tone` (theme colour), `money` | Use only theme tones, never hex. |
| `Card` | `tone="surface"` (default) or `"panel"` (cobalt hero) | At most one `panel` per screen. 16 pt padding, 8 pt gap. |
| `Button` | `primary` (accent fill), `highlight` (yellow, the single most important action, e.g. "Add to jar"), `secondary` (outline), `danger` (outline, coral ink) | Min 48 tall. Pressed state darkens the fill (iOS) or ripples (Android). Disabled is 40% opacity with `accessibilityState.disabled`. Labels are verbs: "Save", "Add", "Settle up". |
| `TextButton` | `tone` | 48 pt tap height with no box. For navigation-ish actions ("Activity") and "Undo". |
| `Field` | `label`, `error`, plus all `TextInput` props | The label sits above, always visible; placeholders only show an example. On error, the border and message go coral ink and the message says how to fix it. |
| `Segmented` | `options`, `value`, `onChange` | Radio-group semantics. Up to 3 options; more need a picker. |
| `CategoryChip` | `category` | Pill, caption size, colours from 2.3. |
| `Progress` | `value` (0–1+), `status` | Fill colour shows the status. **Always paired with words** ("On track", "$10 left…"), so colour is never the only signal. Exposes `progressbar` and a value to screen readers. |
| `Marker` | children | Highlighter stroke behind a phrase, as on the web's `.marker`. Use once per screen at most. |
| `UndoBar` | `message`, `onUndo` | Ink bar with a highlighter "Undo" (cobalt in dark mode, where the bar is moon). Shows for `motion.undoMs` (5 s) after any reversible write. Announced politely to screen readers. |
| `ListRow` / `ListGroup` | `label`, `value`, `onPress`, `first`, `right` / `title`, `footer` | Settings rows: min 52 pt, hairline between rows, chevron when it goes somewhere. A row with its own control (`right`) is a plain View. |
| `AiSwitch` | `value`, `onChange`, `label` (default the AI label; the share screen's "Show amounts" reuses it) | The whole row is the control and the RN `Switch` only shows the state: on iOS 26 taps on RN's `Switch` never land (its frame and UIKit's drawing disagree). One VoiceOver element with `role="switch"`. |
| `CategoryPicker` | `value`, `onChange` | Chips for the six categories, radio semantics. |
| `ProLock` | `onPress` | Grey "Pro" chip with a lock. Opens the paywall; never hides the option it marks. |
| `Avatar` | `name`, `size` | Initial on a colour picked from the name. Friends are just names. |
| `Icon` | `name` ({ios, android}), `size`, `color`, `label` | SF Symbols / Material Symbols via `expo-symbols`, never emoji. Decorative unless labelled. |
| `BudTab` | `onPress` | See 4.10. Raised 12 pt, not 22: RN doesn't deliver touches outside a parent's bounds, so a higher circle had an untappable top. |
| `StoryPager` | `title`, `pages: {label, body}[]`, `onClose`, `footer(index)` | Wrapped's cobalt pages with segment bars. Tap the right or left half; the last page's right half closes. Pages cut, never slide, so Reduce Motion needs nothing. Each page is one `adjustable` element read as its sentence (swipe up/down to move with VoiceOver). |
| `BarChart` | `data: {category, share}[]`, `font` | Horizontal bars sorted by share, % as text on each, on a white `ReceiptCard` with category **ink** fills. Not drawn on a dark surface yet (that needs the tints). |
| `Button variant="onPanel"` | – | Outline button on the cobalt panel (`onPanel` text, `onPanelDim` border). Wrapped's Share. |
| `Bud`, `TreatJar`, `ReceiptCard` (`art.tsx`) | `face` / `share` / children | SVG art. `ReceiptCard` is the torn-edge white slip used by Budgets' StampLedger, Split and the assistant's slips. |
| `AmountPad` | `value`, `onChange`, `digits` | 3×4 keys at 56 pt; the decimal key is hidden for zero-decimal currencies; ⌫ is "Delete"; light haptic per key. Used by Add by hand and the Budget step. |
| `QuickPicks` | `options`, `value`, `onChange`, `label` | 48 pt chips, radio; scrolls sideways at large text. Shown only for currencies on a student scale (`SMALL_UNIT` in `currencies.ts`). |
| `DayStrip` | `value`, `onChange`, `ordinal` | Days 1–31 as 48 pt circles, radiogroup "Rent due on the 28th", scrolled to the chosen day. |
| `ChoiceCard` | `title`, `hint`, `selected`, `onPress` | 64 pt or taller, radio. |
| `StepHeader` | `step`, `total`, `onBack`, `onSkip` | Back, segmented progress (role progressbar, "Step 1 of 2") that fills with a 250 ms layout transition, Skip when optional. |
| `PrintingBud`, `useCountUp` (`art.tsx`) | `face`, `budSize`, `width`, children, `onPrinted` | Bud as a thermal printer: the `ReceiptCard` feeds out from under Bud in three pushes (1.3 s) while Bud buzzes ±1.5 pt, then springs to a −2° tilt. The number counts up 800 ms after. Reduce Motion: already printed, final value. |
| `applyTheme(theme)` | `'system' \| 'light' \| 'dark'` | `Appearance.setColorScheme`; System passes `'unspecified'`. Dark is the default (16 Oct 2026). |
| `useNavigationTheme()` | – | React Navigation theme built from ours, passed to `ThemeProvider` in `_layout.tsx`. Headers, back buttons and screen backgrounds follow the system scheme live. |

**Building new components:** compose these first. If something new is needed, put it in `ui.tsx`, take colours from `useTheme()`, and add a row to this table.

## 4. Screens (spec section 6)

Each screen gets one job, one hero element, and a plain sentence explaining it.

**Concepts:** `docs/concepts/senbud-app-screens.html` draws every screen below at real size (375 pt wide) in light and dark, with Malaysian example data. Open it in a browser and use the theme switch at the top. Screens marked "Concept" are drawn there but not built, and the decisions in 4.1–4.10 are proposals until the user signs them off (open questions in 4.11).

| Screen | Hero (one per screen) | Content, top to bottom | Status |
|---|---|---|---|
| **Welcome** (first launch) | Bud and one line: "Your money buddy" | Wordmark, Bud holding a sample receipt, headline, one line, three promise pills, `primary` "Get started", "I've used Senbud before" (sheet) | Built v2 (`welcome.tsx`, `welcome-back.tsx` sheet) |
| **Onboarding** (first run) | One question per step: the budget amount, then rent | Two steps (budget, rent) and a "You're set" receipt Bud prints; currency from the phone. Settings opens the same steps as the Budget and Rent sheets. | Built v2 (`onboarding.tsx`, steps in `src/onboarding.tsx`, sheets `edit-budget` / `edit-rent`); the five-field Setup page is gone |
| **Home** | `panel` with `hero` safe-to-spend in highlighter | Rent card, pace card, today's nudge, today's receipt, "Again" chips, pinned `CaptureBar` (see 4.2) | Built; v2 concept |
| **Activity** | none; it's a list | Cards with label, `CategoryChip`, date, amount, delete. Later: filter chips, including "added by assistant". | Built |
| **Budgets** | `panel` with what's left in highlighter and `Progress tone="panel"` | `StampLedger` by category; rent and bills list with due days; detected subscriptions | Built |
| **Can I afford it?** | `panel`: verdict in words, key number in highlighter | Price `Field`, optional "What is it?", treat price picks, hours of work under a hairline | Built |
| **Friends** | Net balance `hero` in highlighter, direction in words | Per-friend rows; friend sheet with "Send on WhatsApp", "Other apps", "Copy" and "Mark paid"; 3-step split flow with `PersonTabs` and `ClaimRow` | Built; WhatsApp path untested (not installed on simulators) |
| **Treats** | `TreatJar` filling toward a goal, total in highlighter, `highlight` "Add to jar" inside the panel | Treat list with "every N days" and status, short history, month-end leftover sheet | Built. The leftover sheet (`leftover.tsx`) opens when the app comes to the front after a period ended under budget (see 4.6) |
| **Wrapped** | One stat per page, full-bleed `panel` | `StoryPager`, `BarChart` on a `ReceiptCard`, share image | Built (`wrapped.tsx`, `share.tsx`), opened from Budgets → Wrapped. Free: total vs budget, top category, kept. Pro: top place, treats, hours of work, best streak. Captions are written from the numbers until the assistant has AI. No year-end edition yet. |
| **Settings** | none | Grouped `ListRow`s: Money, AI, Look, Your data, Senbud Pro, then `danger` Erase | Built, plus "Restore from a backup" and a pushed "What gets sent" screen |
| **Senbud Pro paywall** | selected plan as `panel`; the buy button is the one `highlight` | Title, three benefits, plan radio group, buy button, small print with Terms, Privacy, Restore (see 4.8b) | Built (`pro.tsx`) |
| **Assistant** | – | `BudTab`, the middle of the tab bar, opens the assistant with chat | Built: rules answer on the phone (afford, month, split, quick add); free-text questions go to `POST /v1/agent/ask` (Pro, AI on, their own consent slip on first use) with only the "What gets sent" summary. A `modal`, not a form sheet: RNScreens' formSheet mis-lays a ScrollView with a pinned input row. |

**Empty states:**
- One sentence with a concrete example of what to do: "Type 'lunch 12' on Home to add your first expense."
- No illustrations needed.

**Errors:**
- Shown inline, under the field, saying how to fix it.
- Destructive confirmations use the native alert. The red button names the action ("Erase") and the body says what's lost.

### 4.0 Bud, the assistant's face

- **What it is:** a small thermal receipt with a face. It has a receipt-white body with torn edges, an ink outline, two printed lines as a fringe, and coral blush. The Highlighter-S tile and the `Sen[bud]` wordmark stay the app's logo; Bud is the assistant.
- **No highlighter on Bud,** so it never competes with a screen's key number.
- **Four faces:**
  - happy (default)
  - thinking (an answer is loading)
  - oops (offline or AI off)
  - yay (Pro unlocked, a jar goal reached)
- **Where it shows:** inside `BudTab` in the middle of the tab bar (38 pt), the assistant sheet header (32 pt), Welcome (about 170 pt) and empty states. It's never in copy, and it never replaces words. Smallest size is 24 pt.
- **Accessibility:** decorative (`accessibilityElementsHidden` / `importantForAccessibility="no"`). The button keeps its label "Ask Senbud". An idle wobble on the button is off under Reduce Motion.
- **Same drawing in both themes:** the white body reads on paper, night and cobalt. It's drawn with `react-native-svg`.
- **Name:** Bud (decided 16 Oct 2026).

### 4.1b Welcome (first launch)

- **Decided 16 Oct 2026:** Senbud stays account-free. Data lives in SQLite on the phone; a backup file covers moving phones. Optional Sign in with Apple or Google comes later, only for encrypted sync, as a Pro feature.
- **No sign-in wall.** The spec promises no bank login and no accounts, and Pro uses an anonymous RevenueCat id, so "Get started" goes straight to Setup.
- **Concept v2** (`docs/concepts/senbud-onboarding.html`, 16 Oct 2026). Top to bottom:
  1. The `Sen[bud]` wordmark.
  2. Bud standing on a small printed receipt: "For example · today", "Rent on the 28th: covered", and "Safe to spend RM 59.37" in highlighter. VoiceOver reads "For example", so nobody takes the number as theirs.
  3. The headline "Your money buddy.", then one line: "Know what's safe to spend today. No bank login, ever."
  4. Three promise pills: "No bank login", "No account", "Stays on your phone".
  5. `primary` "Get started".
  6. `TextButton` "I've used Senbud before".
- **"I've used Senbud before"** opens a native form sheet. In the build today it expands a card below the fold, so the tap looks like it does nothing. The sheet says "There's no account to log in to. Bring your things back here:", then lists "Restore from a backup" (Files or Google Drive) and "Restore Senbud Pro" (Apple or Google account), a note about Settings → Back up everything, and "Not now".
- **Motion** (once, and off under Reduce Motion):
  - Bud pops in (450 ms), then buzzes lightly while the receipt feeds out from under it like a thermal printer.
  - The feed is three pushes with short pauses (1.3 s); then the paper swings and settles at a slight tilt.
  - The sample number counts up once the paper stops (from 1.6 s, 800 ms).
  - The text rises in reading order, 100 ms apart.
  - Nothing loops. Bud doesn't bob or blink during onboarding, so 2.5 holds.
- **Sign in (later, Pro, for encrypted sync only):**
  - An optional sheet: "Use Senbud on more than one phone". It explains that spending is encrypted on the phone before it's sent.
  - Buttons: Sign in with Apple first, then "Continue with Google", then "Not now".
  - If Google sign-in is offered on iOS, Sign in with Apple is required (App Review 4.8).

### 4.1c Setup flow (concept v2)

Today's Setup asks five things on one page: period, budget, rent, due day and currency. The concept asks two questions, one per screen, then shows the result.

- **Route:** `/onboarding` with a step state (`budget` → `rent` → `ready`). Nothing is saved until "You're set". Back steps backwards. "Go to Home" `replace`s to `/`.
- **Step header:** Back, a two-segment progress bar (role progressbar, "Step 1 of 2") and "Skip" when the step is optional.
- **Step 1, Budget (required):**
  - The question is "How much do you have each month?". The period word is a button that switches between month and week; month is the default (today's Setup defaults to week).
  - The helper line says rent is included: "Everything you have, rent included. Senbud sets rent aside first." This matters because `safeToSpend` subtracts rent from the limit.
  - Below that:
    - The amount in `hero` size.
    - The currency chip ("RM · Malaysian ringgit", with Change). It's filled from `expo-localization` and falls back to USD.
    - Four `QuickPicks` chips (800/1,000/1,400/2,000 a month, or 150/250/350/500 a week).
    - The `AmountPad` keypad, so the system keyboard never covers Next.
    - `primary` "Next", disabled at 0.
- **Step 2, Rent (optional, with Skip):**
  - "Do you pay rent?" with two `ChoiceCard`s: "Yes" or "No rent" (family, hostel or free).
  - If Yes:
    - Amount chips (350/450/600) and a field.
    - A `DayStrip` of 48 pt day circles, centred near the likely day.
    - A note: "Bills like your phone plan can go in later, in Budgets."
- **"You're set":**
  - Bud (yay face) prints a receipt out of its bottom edge, like a thermal printer: budget this month, rent on the 28th (−RM 450), days left (16).
  - Then "Safe to spend today" counts up to the number in highlighter: RM 59.37, or RM 87.50 with no rent.
  - The number uses the same floor-to-the-sen maths as `safeToSpend`. Rent that falls due after this period shows "next month" and isn't subtracted.
  - "Go to Home". Hourly rate and bills wait for Settings or Home cards.
- **Settings → Budget and rent:** two rows that open the same two steps as sheets, replacing the five-field page.
- **New components:**
  - `QuickPicks`: 48 pt chips, role radio.
  - `DayStrip`: horizontal radiogroup, label "Rent due on the 28th".
  - `ChoiceCard`: 64 pt or taller, role radio.
  - `StepHeader`.
  - Plus the existing `AmountPad`, `ReceiptCard` and `Bud`.
- **Motion:**
  - Steps slide 24 pt with a fade (250 ms) and the progress segment fills.
  - Chip and key taps tick the amount 4 pt (150 ms), with a light haptic.
  - The rent fields expand with a layout spring.
  - On "You're set", Bud feeds your receipt out the same way as on Welcome; the total counts up once the paper stops, then Bud hops once.
  - Reduce Motion turns all of these into cuts and final values.
- **Open questions:**
  - Should there be zero onboarding questions (ask on Home instead)? This concept keeps two, because Home without a number misses the point.
  - Month or week as the default period?
  - Keep the sample receipt on Welcome?

### 4.1 Navigation (all screens)

- **Tab bar with five slots:** Home, Budgets, **Bud**, Friends, Treats (decided 16 Oct 2026).
- **Current tab:** `tabActive` colour (cobalt in light, highlighter in dark), a soft pill in that colour behind the icon, and the filled SF Symbol on iOS. More than colour alone, so it reads without colour vision and while a slow screen is still drawing (17 Oct 2026).
  - The four sides use SF Symbols (`house`, `chart.bar`, `person.2`, `gift`) and Material icons on Android. Tint is `accent`.
  - Bud (`BudTab`) is raised in the middle and opens the assistant sheet over the current screen; it doesn't switch tabs.
  - It's built with Expo Router's JS `Tabs` and a custom `tabBarButton` for the centre, because native tabs can't raise a button. That means we own Dynamic Type and safe-area handling for the bar.
- **Pushed, not tabs:**
  - Activity, from the pace card's "See activity".
  - Can I afford it?, from Home.
  - Wrapped, from the Home nudge on the 1st and from Budgets → Past recaps.
  - Settings, from the button at the top right of Home.
- **Titles:** tab roots other than Home use large titles. Home has no title; the date label sits in the nav bar and the panel is the first thing you see.
- **No floating button.** Bud in the tab bar is the assistant on every tab, Home included. Pushed screens keep the tab bar; full-screen modals (Wrapped, paywall, sheets) hide it.

### 4.2 Home v2

- **Top to bottom:**
  1. Date label and Settings button.
  2. `panel`: safe to spend today.
  3. Rent card.
  4. Pace card, with "See activity".
  5. Today's nudge (`NudgeCard`), only when there is one.
  6. Today's receipt: a `ReceiptCard` headed "TODAY" with today's last 3 items as `ReceiptLine`s, "and N more" to Activity, and a dashed "Total" in plain ink (no `Marker`: the hero is Home's one highlight). Added 17 Oct 2026 to fill the empty space under the pace card on tall phones.
  7. "Can I afford it?" `TextButton`.
  8. "Again" chips, pinned just above the capture bar: things logged at least twice in the last 30 days (`favourites` in core), most often first, at their last price. One tap saves through the same path as a quick add, with Undo. Neutral surface chips, not category tints (Treat's tint is yellow). Hidden while the `UndoBar` shows.
  9. `CaptureBar`, pinned above the tab bar. `UndoBar` floats just above it.
- **Nudges (spec 5):**
  - Rent (priority 1) and pace (priority 2) nudges go *inside* the rent and pace cards, so the same sentence isn't shown twice.
  - Example: "Rent RM 450 in 4 days — RM 338 short." plus a caption and a `secondary` "Plan for rent".
  - `NudgeCard` therefore only carries priorities 3–5: renewals, IOUs older than 7 days, treats.
- **When rent isn't covered**, the hero shows RM 0 with "Rent comes first. This goes back up once it's covered." The panel stays cobalt.
- **Capture bar:**
  - The camera button opens the receipt flow (the Pro screen for free users).
  - The text field takes quick text.
  - The pen button opens the "Add by hand" sheet.
  - The field is also the assistant's way in on Home:
    - Text with amounts saves straight away through `parseSpending`, with Undo. This works with AI off.
    - A question opens the assistant sheet with the answer.
- **Add by hand sheet (spec 4.1):**
  - `AmountPad` first.
  - Category chips, with last time's category pre-selected (selected chip gets a 2 pt `text` ring).
  - "What was it?" field, today's date, and "Repeat: Grab RM 12".
  - `primary` "Add RM 6.50".
- **First day:** the empty-state line sits inside today's receipt: "Type what you spent below, like 'nasi lemak 6.50'. Senbud does the rest." Later days with nothing logged yet say "Nothing yet today." The field shows focus.
- **Examples follow the currency, as a stand-in for where the user spends:** the words and prices in example text and placeholders come from one line per currency in `packages/core/src/examples.ts` ("coffee 4.50, uber 15" in dollars, "kopi 4.50, grab 12" in ringgit, "americano 4500, taxi 12000" and "kimbap 4000" in won). Quick picks and number placeholders are written at ringgit scale and scaled by `localAmount`. A test checks every example parses back into the right category.

### 4.3 Budgets

- **Hero:** `panel` with the period label ("October · monthly"), what's left in highlighter, `Progress tone="panel"`, and "RM 498 of RM 1,400 spent. On track, 16 days to go."
- **By category: `StampLedger`** (chosen over a chip-and-bar list, which read as generic):
  - A `ReceiptCard` headed "OCTOBER · BY CATEGORY", one row per category: name, dotted leader, "248 / 400" in mono.
  - Under it, 10 stamps, each 10% of the limit (rounded), filled with the category ink. The receipt is white in both themes, so the inks pass there in dark mode too.
  - What's left sits at the end of the stamps: "152 left" in dim ink; amber "24 left, go easy" when close; coral "12 over" plus one coral stamp outside the ten when over.
  - Categories with no limit show the amount and "No limit".
  - Over budget also offers a fix in a card under the receipt: "Food is RM 12 over. Move it from Treat, which has RM 39 left?"
- **Rent and bills:**
  - A `List` with due day and countdown, then `+ Add a bill`.
  - The caption under it says how much is set aside: "RM 492.90 is set aside and never counts as spendable."
- **Detected subscription (Pro):** a card that asks first: "Netflix charged RM 17 on 3 Sep and 3 Oct. Is it a subscription?" with "Not really" / "Yes, track it".
- **Budget settings rows:** Period, Until payday (`ProLock`), Past recaps.
- **Over:** the category gets a coral stamp past its ten and "12 over" in `bad` ink. The panel never turns red.
- **Empty:** "Give a category its own limit, like Food at RM 400 a month." with `secondary` "Add a category limit".

### 4.4 Can I afford it?

- **Top to bottom:**
  1. Price `Field`: 28 pt text, numeric keyboard, focused on open.
  2. Optional "What is it?" field.
  3. Picks with your treats' last prices (empty state only).
  4. `panel` with the answer.
  5. A `secondary` action.
- **The answer updates as you type** (debounced). There's no Check button.
- **Panel:**
  - Verdict in `title`, then a label, the key number in highlighter, and a caption.
  - Under a hairline: "= 12 hours of work at RM 10/hr" (spec 4.6, rounded to 0.5).
- **Verdicts:**

| Verdict | Title | Highlighter | Caption | Action |
|---|---|---|---|---|
| Yes | "Yes, go for it." | per day after (RM 18.06) | "a day till the 31st. Rent's still covered." | "I bought it" |
| Tight | "Doable, but tight." | per day after (RM 6.81) | "a day, down from RM 25.56. Wait till payday on the 25th?" | "I bought it" |
| No | "Not this month." | the date it fits ("1 Nov") | "Rent's in 12 days, and this would eat into it." | "Remind me on 1 Nov" |

- **"No" never turns the panel coral.** The highlighter shows when it fits instead of a shortfall.
- **No hourly rate:** the hours line is replaced by a card: "Want prices in hours of work? Add what you earn an hour." with an "Add hourly rate" `TextButton`.
- **Before you type,** the panel shows safe to spend today with "Type a price and Senbud checks it against this, rent first."

### 4.5 Friends

- **Hero:** net balance on `panel` in highlighter in *both* directions. The label carries the direction ("Owed to you" / "You owe overall"), and the caption says the rest ("across 3 friends, after the RM 8 you owe Wei Ling."). This replaces the earlier "`good` if owed, `bad` if you owe": painting "you owe" coral reads as a telling-off.
- **Rows:**
  - `Avatar` with initials, name, and the latest note and date.
  - The amount, with "owes you" in `good` or "you owe" in `textDim`.
  - IOUs older than 7 days get a sub-line with a "Remind" `TextButton`.
- **Below the list:**
  - `primary` "Split a bill" (also `+` in the nav bar).
  - "2 settled this month" opens history.
- **Friend sheet:**
  - Avatar, name, and what they owe.
  - Their IOUs.
  - The pre-written message in a sunken box ("Hey Sarah! Grab to Mid Valley was RM 23.10!").
  - **`primary` "Send on WhatsApp":**
    - Calls `Linking.openURL('whatsapp://send?text=…')` with the message URL-encoded. WhatsApp opens with the text ready; the person picks the chat and taps send.
    - No phone number is needed, so there's still no contacts access, and Senbud never sends anything itself.
    - The button shows only when `Linking.canOpenURL` says WhatsApp is installed. That needs `LSApplicationQueriesSchemes: ["whatsapp"]` (iOS) and a `<queries>` entry (Android) in `app.json`.
  - **`secondary` "Other apps"** calls `Share.share({ message })`, the native share sheet (Telegram, Messages, and so on).
  - **`secondary` "Copy"** copies the message.
  - Then "Opens WhatsApp with this message ready. You pick the chat and tap send."
  - **`secondary` "Mark paid"** (`good` ink), which shows `UndoBar`.
  - The row-level "Remind" opens this sheet.
- **Split flow: three steps**, replacing the per-item, per-person circle grid:
  1. **Who and how.**
     - The receipt summary ("Restoran Ali Maju · RM 31.30 · 5 items from your photo").
     - "Who was there?" as 48 pt name chips plus "+ Add".
     - "Who paid?" as `Segmented`.
     - "How to split it?" as two radio cards: By item (Pro) or Evenly ("About RM 10.43 each"). Evenly skips step 2.
  2. **Who had what.**
     - `PersonTabs` across the top, one per person, with running totals.
     - Pick a person, then tap their items on the `ReceiptCard`. Each item is a full-width 52 pt `ClaimRow` with the owners' initials and a checkbox for the selected person.
     - Shared items are tapped for each person and split evenly.
     - Unassigned items get an amber hatch and "Not assigned". "1 item left: Milo ais" shows above a disabled "Next".
  3. **Check and save.**
     - One row per person: what they had, their total, and "your Food" or "owes you".
     - "Total, paid by you".
     - A line about service charge and SST: split by each person's part when present.
     - `primary` "Save split" and "Change amounts" (the old "Amounts" mode).
  - Your share becomes an expense; the rest become IOUs (`iousFromSplit`). Worked example: RM 31.30 becomes RM 12.00, RM 9.30 and RM 10.00.
- **Empty:** "Paid for the group? Snap the receipt, or type something like 'dinner 45 with Aiman and Sarah'." with "Friends are just names. Senbud doesn't read your contacts."

### 4.6 Treats

- **Hero: `TreatJar`, a jar that fills,** on the `panel`:
  - The jar is drawn in `onPanel` outline with a white lid, and the money inside is highlighter yellow with coin outlines. So the fill *is* the key number drawn, and the total in highlighter sits under it.
  - Tick marks at each quarter, and a dashed line at the goal.
  - Beside the jar: the goal ("Movie night for two, RM 60"), "78% full", and "Change goal".
  - Under it: the total `hero`, a caption in treats ("= 4 Tealives or 2 movies at GSC. RM 13.50 to your goal."), then `highlight` "Add to jar". The screen has one yellow zone.
- **The jar needs a size, so it gets a goal.**
  - Fill = jar ÷ goal. This needs a new field, `treatJar.goalCents` (spec 7). Approved 16 Oct 2026.
  - **No goal:** an empty jar with "Pick something to fill it for, like a concert." and "Set a goal".
  - **Goal reached:** the jar overflows a little, the side says "Full", the caption says "Goal reached. Movie night for two is covered, with RM 1.90 spare.", and the button becomes "Spend RM 60 on movie night".
  - Adding money animates the fill rising (`motion.slow`). It just updates under Reduce Motion.
- **The `Marker` on the jar name is dropped:** it would be a second yellow thing.
- **Your treats** list:
  - Name, your own last price, and "every N days · last 9 days ago".
  - Status in words: "Fits today" in `good`, or "Next in 9 days" in `textDim`.
- **History:** a short list with "See all".
- **Month-end leftover:**
  - A sheet on the 1st (or reached from the Home nudge): "September's done. You finished RM 38 under budget. Move it to the treat jar?"
  - `primary` "Move RM 38 to the jar" and `secondary` "Keep it in October's budget".
  - In dark mode `primary` and `highlight` look the same (section 7). On this screen that's acceptable, because the sheet covers the panel.
  - **Built:** on launch and whenever the app comes back to the front, the tabs layout checks whether a budget period (week or month) ended since the last look (`app.period_handled`, migration 5; `closedPeriod` in core). Leftover = limit − spending − bills that fell due in that period (`periodLeftover`), so rent money is never offered as treat money. Only the latest period is offered after time away. A new install, an update, or a changed budget records the current period without asking.
  - The secondary button is "Not now", not "Keep it in October's budget": carry-over is Pro (spec 8) and not built, so the money doesn't move anywhere. Closing the sheet counts as "Not now"; it never asks twice.
  - The title is the month name only when the budget starts on the 1st ("September's done"); otherwise "Last month's done" or "Last week's done".
- **Learned treat:** "You've had Tealive 4 times this month. Make it a treat?" with two `secondary` buttons. This asks before adding, as spec 4.8 says.
- **Empty:** the jar hero at RM 0 with "Leftover budget lands here at the end of each month.", the learned-treat card, then "Or add one yourself, like 'bubble tea'. Senbud remembers what you paid."

### 4.7 Wrapped

- **`StoryPager`** of full-bleed `panel` pages:
  - Segment bars at the top, the month as a label, and Close.
  - One stat per page in highlighter, up to 96 pt (above the `hero` size; Wrapped is the one place it grows).
  - `Button` "Share" with an outline on cobalt.
- **The pages are the same in light and dark:** cobalt and the white receipt don't follow the theme, as on the web.
- **Cards (spec 4.9):**
  - total vs budget ("You spent 88% of your budget.")
  - top category (`BarChart` on a `ReceiptCard`)
  - top place ("7-Eleven, 31 visits. That's nearly one a day.")
  - treats
  - hours of work
  - money saved
  - best streak
- **The AI writes the captions; the numbers come from local data.**
- **No autoplay.** Tap the right or left half to move, swipe down to close. With Reduce Motion, pages cut instead of sliding.
- **Share screen:**
  - A 9:16 `ReceiptCard` preview in mono type: the headline stat with a highlighter mark, then dotted-leader lines (Top category, Top place, Treats, Hours of work, Best streak), with "Made with Senbud" at the bottom.
  - A "Show amounts" `Switch`, off by default.
  - `primary` "Share image" opens the native share sheet.
- **Pro:** free users get the basic monthly cards; Pro adds the full set and the year-end edition.
- **Built (16 Oct 2026):** free cards are total vs budget, top category and what you kept (or how far over). Pro adds top place, treats, hours of work (when an hourly rate is set) and best streak; free users get a last page "There's more" with `highlight` "See plans". The share image lists only the stats the person can see.
  - Bills count as spent, since rent is part of the budget. A weekly budget is scaled to the month (× days ÷ 7).
  - Best streak: the longest run of days that each stayed within the month's budget after bills ÷ days. Days with no spending count.
  - "Top place" is the most repeated label (2+ times); Senbud has no shop names apart from what you type.
  - The share image is a 9:16 receipt on cobalt, captured with `react-native-view-shot` and shared with `expo-sharing`. Android draws the receipt's dashed rules solid (RN ignores `borderStyle: 'dashed'` on a single border there).

### 4.8 Settings

- **No hero.** Inset grouped `ListRow`s:
  - **Money:** Currency, Hourly rate, Budget and rent (the existing Setup screen).
  - **AI:**
    - `Switch` "Use AI for photos and questions".
    - A "What gets sent" row.
    - Footer: "Typing 'kopi 4.50' always works, AI or not. Everything is stored on this phone."
  - **Look:** `Segmented` Light / Dark / System. This closes the open item in section 7.
  - **Your data:** "Export spending (CSV)", "Back up everything".
  - **Senbud Pro:**
    - A card with one line of what you get and `primary` "See plans", which opens the paywall (4.8b; code in `mobile/src/app/pro.tsx` on `claude/senbud-pro`). Card copy follows the paywall: "Senbud Pro does the typing for you: snap receipts, unlimited assistant, subscription reminders."
    - A "Restore purchases" `TextButton`.
    - Pro members see "Senbud Pro · Active" and "Manage".
  - Then `danger` "Erase all data" with "Privacy · Terms" under it.
- **What gets sent** (pushed screen), three cards:
  1. "When you snap a receipt": the receipt consent text from `receipt.tsx`, word for word.
  2. "When you ask a question": the question and the last few questions and answers in this chat (up to 4, never saved), plus a short summary (this month's totals, budget and rent, the last 20 expenses), never the full history. It names the model (currently Anthropic's Claude Haiku, run by Google, through OpenRouter). This is spec 3's "AI sees" rule.
  3. "Never leaves the phone": expenses, friends' names, treats and the jar.
  - Then the same `Switch` again.
- **Erase:**
  - Native alert: "Erase all data?" / "This deletes every expense, budget, IOU and treat on this phone. Export first if you want a copy. It can't be undone."
  - Buttons: Cancel and a destructive "Erase".

### 4.8b Senbud Pro paywall

- **Opened from:** Settings → "See plans", any `ProLock`, and the camera for free users. A full-screen modal with Close (48 pt) at the top right. There's no tab bar.
- **Copy (chosen by the user):**
  - Title (`title`): "Senbud Pro does the typing for you".
  - Three benefit rows, each with a system icon on a `surface` circle, a `bodyStrong` name and a `caption` line:
    - Snap receipts: "Take a photo. Senbud reads the shop, items and prices."
    - Unlimited assistant: "Ask or add as much as you like."
    - Subscription reminders: "A heads-up the day before Spotify or Netflix renews."
  - No trial wording, ratings or countdowns.
- **Plans:**
  - A radio group of two cards, at least 64 pt tall: Yearly ("$39 a year", shown as "$3.25 a month") and Monthly ("$4.99 a month").
  - Yearly is preselected.
  - The selected card is the cobalt `panel`, and it moves when you pick the other plan.
- **Prices come from RevenueCat** in the store's currency, never typed into the app. The monthly equivalent is the yearly price ÷ 12, formatted with `money`.
- **One yellow thing:** the buy button is `highlight`, labelled with what you pay ("Subscribe for $39 a year"). Prices on the panel stay `onPanel` white. This holds in dark mode too, because the screen has no `primary` button.
- **Small print:** "Renews automatically until you cancel. Cancel any time in your App Store settings, at least a day before it renews." Then Terms, Privacy and "Restore purchases" as `TextButton`s.
- **States:**
  - **Buying:** the button dims and shows a spinner with "Waiting for the App Store". Close is disabled until the store sheet returns.
  - **Prices can't load** (offline, store down): a card says "Couldn't load prices. Check your connection and try again. Senbud keeps working without Pro." with `secondary` "Try again". Terms, Privacy and Restore stay.
  - **Restore finds nothing:** an inline caption under the links: "No Senbud Pro purchase found on this Apple or Google account." (the copy already in `receipt.tsx`).
  - **Done:**
    - `panel` with the label "Senbud Pro", "You're in." in highlighter, and the renewal date.
    - "Try it now: snap a receipt and Senbud fills in the items for you."
    - `secondary` "Snap a receipt" and a "Done" `TextButton`.

### 4.9 Assistant

- **`BudTab`:** Bud (4.0) on a raised cobalt circle in the middle of the tab bar. On Home the capture bar's text field also opens the sheet when you type a question.
- **Sheet:** a native form sheet, opening near full height so the conversation has room.
  - **Background:** dotted notebook paper (the web's dot grid, 18 pt).
  - **Header:** `Bud` (36 pt, its face matches the state), "Bud" with "Your money buddy" under it, and Close.
  - **When it opens:** not an empty chat. Bud at 96 pt, "What's up?", one line ("Ask me anything about your money, or tell me what you spent."), and four starter cards in a 2×2 grid ("Can I afford…", "How's my month?", "Split a bill", "Add a few things"), each with a one-line hint. Tapping one fills the box.
  - **Your messages:** `NoteBubble`, short cobalt notes on the right.
  - **Bud's replies:** `BudSlip`. Bud is a receipt, so it prints its answers as small torn-edge receipt slips with Bud's face beside them:
    - a mono header ("Can I afford it?", "Added", "Split this?")
    - dotted-leader lines and a total
    - one number marked with the highlighter stroke (the screen behind is dimmed, so it doesn't compete with that screen's hero)
    - actions under the slip
  - **While loading,** the slip starts "printing": the header plus shimmering placeholder lines, and Bud's thinking face. With Reduce Motion it shows static lines.
  - **Input row:** camera, the field "Ask or add…", and a send button that is `accent` when there's text and `surfaceSunken` when empty.
- **Answers reuse the rules.**
  - "Can I afford" gives the same verdict as 4.4: "Concert ticket RM 45.00", then "Yes. RM 22.75 a day after", "till the 31st, rent still covered · 4.5 hrs of work", with actions "I bought it" and "Open in Can I afford it?".
  - A quick add prints an "Added" slip with each line and "Today RM 16.50", with Undo and Edit.
- **Asks first when unsure:** a "Split this?" slip showing exactly what would be saved ("Badminton court RM 32.00", "You RM 16.00", "Aiman owes you RM 16.00"), then `secondary` "Just mine" / `primary` "Yes, split it".
- **AI off:** an "AI is off" slip with Bud's oops face: "AI is off, so I can't answer questions. Quick adds still work, like 'kopi 4.50'." with `secondary` "Turn on AI in Settings". The camera button is hidden, and the field's placeholder becomes "kopi 4.50, grab 12".
- **Offline:** "Can't reach Senbud right now. Anything you add is still saved on your phone." with a "Try again" `TextButton`. Plain text, never red.
- **Questions in your own words** (built): Senbud Pro only, like receipts; free users get a "Senbud Pro" slip with `secondary` "See plans". The first question (or the first receipt) opens the one "Bud uses AI" consent sheet (`ai-consent`, stored as `ai_consent_at`), which covers photos and questions together; Not now prints a slip with "Ask with AI". Turning AI off in Settings withdraws it. The app sends only the question, this period's totals, budget and rent, and the period's last 20 expenses; the API validates that shape and drops anything else.
  - **Guardrail:** the model returns `{ on_topic, answer, actions }`. Off topic (anything that isn't the person's money or money-adjacent student life) prints a fixed line written by the API, never model text, with two suggestion chips. Obvious misuse (code fences, "ignore previous instructions", "write me an essay") is refused without a model call. Three off-topic questions in a day pause AI questions until tomorrow ("Let's stick to your money today"); rule-based answers keep working. Lines that start like a question ("who…", "which…", "tell me…") never go to quick add.
  - **Actions:** up to 2 `secondary` buttons under an answer: "Set a {Category} limit of {amount}", "Add {name} as a bill", "Open the treat jar", "See Budgets". Each opens the existing sheet prefilled; nothing is saved until the person taps Save there.
  - **Thinking:** while Bud works, the slip prints what it's doing a step at a time ("Going through your spending…", "Checking rent and bills…", "Counting what's left…", "Writing it down…") over the shimmer lines, stopping on the last step.
  - **Speed and cost:** Claude Haiku 5.5 with thinking off (`OPENROUTER_ASK_MODEL`), numbers sent as compact text, answers under 45 words, OpenRouter routed by latency. About 1.5 to 3 s and about US$0.00015 per question (Gemini Flash was 2.5 to 10 s and up to US$0.001).
- **Bud speaks first** (built, all on the phone, nothing sent):
  - **Notes** (core `nudges`), most important first:
    - a bill due within 3 days, covered or not;
    - a category with a limit that's close, over, or ahead of pace;
    - a renewal tomorrow;
    - a newly spotted subscription;
    - an IOU older than 7 days;
    - 3 or more days in a row under the daily share, counted from the first thing logged this period;
    - a treat, only when nothing else is said.
  - **Where they show:** Home shows the first one that isn't rent (rent has its own card), as before: one a day at most, and its "Not today" hides Home's card until tomorrow. The Bud screen lists up to 3 under "What's up?" with the label "Bud noticed".
  - **"Not today"** is stored per note in `nudge_dismissals` (cleared by Erase all data, not backed up), so it survives a relaunch.
  - **Not notes:** month-end leftover has its own sheet, and overall pace has Home's progress card.
  - **Answered without AI:**
    - "how much on food" (a category name, else labels containing the words);
    - "biggest spend";
    - "when's rent / next bill";
    - "how many days left";
    - "compared to last month", which compares the same day of the last period.
  - **Home's capture bar** uses the same rules (`readIntent`): only quick adds are saved there; anything else opens Bud.
  - **Starter chips** follow the state: "Next bill?" when one is due within 3 days, "Can I afford 20?" on a tight day, "How much on {top category}?", then the usual four. Four at most.

### 4.10 Proposed components

These are additions to `ui.tsx` for the screens above. Each takes colours from `useTheme()`, keeps 48 pt taps, and gets a row in the section 3 table when it's built. Native first; the only new dependency is `react-native-svg`, for `ReceiptCard`, `TreatJar` and `Bud`.

| Component | Props and variants | States and rules |
|---|---|---|
| `Tabs` | Expo Router JS tabs | Five slots (4.1): four tabs with SF Symbols / Material icons and `accent` tint, plus `BudTab` in the middle. Labels scale with Dynamic Type. |
| `NudgeCard` | `message`, `actions` (≤ 2), `onDismiss` | Surface card, "Today" `label`, one sentence, `TextButton`s. One a day at most; core picks it. Not a live region. |
| `CaptureBar` | `onSnap`, `onSubmit(text)`, `onManual` | Pinned above the tab bar; rises with the keyboard. 48 pt icon buttons labelled "Snap a receipt" and "Add by hand". Amounts → `parseSpending` + `UndoBar`; questions → assistant sheet; camera without Pro → Pro screen. |
| `Sheet` | Expo Router `presentation: 'formSheet'`, detents medium/large | `surface`, `radius.lg`, grabber, shadow (it floats). No JS sheet library. |
| `AmountPad` | `value`, `onChange`, `currency` | 3×4 keys ≥ 48 pt; the decimal key is hidden for zero-decimal currencies (KRW, JPY). Keys are buttons; ⌫ is labelled "Delete". Light haptic on press. |
| `List` + `ListRow` | `label`, `value`, `accessory` (chevron / `Switch` / none), `onPress` | Inset grouped, min 52 pt rows, hairline separators inset 16. At large text the value wraps under the label. |
| `Switch` | RN `Switch` | `trackColor.true = accent`, `thumbColor = surface` (7.6:1 light, 15:1 dark). |
| `Progress tone="panel"` | as `Progress` | Track is white at 22% on cobalt. Fills are mint, amber, and **coralLight** for over (plain coral is 2.7:1 on cobalt). Still paired with words. |
| `PersonTabs` | `people: {name, totalCents}[]`, `selected`, `onSelect` | Split step 2. Equal-width tabs at least 52 pt tall, each with the name and a running total. The selected tab is `accent`. Role `tab`, label "Sarah, RM 10.00 so far". |
| `ClaimRow` | `item`, `owners`, `mine`, `onToggle` | A full-width 52 pt row on a `ReceiptCard`: name, price, owners' initials (24 pt, decorative), and a 28 pt checkbox for the selected person. Unassigned rows get an amber hatch and "Not assigned". Role `checkbox`, label "Sarah had Maggi goreng". |
| `TreatJar` | `cents`, `goalCents?` | `react-native-svg` jar on `panel`: `onPanel` outline, highlighter fill with coin outlines and a wavy top, quarter ticks, dashed goal line. It overflows a little past 100%. Decorative; the numbers next to it carry the meaning. |
| `Bud` | `face: 'happy' \| 'thinking' \| 'oops' \| 'yay'`, `size` | The assistant mascot (4.0). `react-native-svg`, the same drawing in both themes, decorative. |
| `Avatar` | `name` | 40 pt initials circle on `surfaceSunken`. Never a photo; no contacts access. |
| `BudTab` | `onPress` | Centre slot of the tab bar: 56 pt `panel` circle raised 12 pt above the bar (22 left its top untappable), `Bud` (38 pt) inside, label "Bud" under it, shadow, 1.5 pt `onPanelDim` ring in dark mode. Opens the assistant sheet (`tabPress` → `preventDefault`), never navigates. Role button, label "Ask Bud". Idle wobble off under Reduce Motion. |
| `StoryPager` | `pages`, `onClose` | Full-bleed `panel` pages with segment bars. Tap the halves to move, swipe down to close, no autoplay, cuts under Reduce Motion. Each page is one accessibility element read as a sentence. |
| `StampLedger` | `rows: {category, spentCents, limitCents?}[]` | Budgets by category (4.3). `ReceiptCard`, dotted leaders, 10 stamps per limit in category ink, words for left/close/over, a coral stamp outside the ten when over. Each row is one 48 pt button labelled "Food, RM 248 of 400, RM 152 left". |
| `BarChart` | `data: {category, share}[]` (≤ 6) | Horizontal, sorted, with the % as text on every bar. Fill is the category **ink** on white or a receipt, and the category **tint** on a dark `surface`. |
| `ReceiptCard` | `children` | White in both schemes with zig-zag torn edges (the web's `.receipt`), via `react-native-svg`. The share image is captured with `react-native-view-shot` and sent to the native share sheet. |
| `ProLock` | `onPress` | Grey `Other`-style chip with a lock and "Pro" next to a locked option. Opens the paywall (`pro.tsx`). It never hides the option. |
| `BudSlip` | `title`, `lines`, `total?`, `marked?`, `actions`, `state: 'ready' \| 'printing'` | Bud's reply: a `ReceiptCard` slip (8 pt teeth) in mono, with `Bud` beside it. One highlighter-marked number at most. Actions sit under the slip. Printing shows placeholder lines, which are static under Reduce Motion. Read by screen readers as one sentence. |
| `NoteBubble` | `text` | Your message: `panel` fill, `onPanel` text, right-aligned, corner tucked at the bottom right. Cobalt in both schemes. |

**Contrast added by these components** (add to 2.2 when built):

| Pair | Ratio | Note |
|---|---|---|
| mint on cobalt | 4.0 | `Progress tone="panel"` fill (non-text, needs 3:1) |
| amber on cobalt | 4.7 | same |
| coralLight on cobalt | 3.3 | same; plain coral is 2.7 and fails |
| cobalt `BudTab` on night | 2.4 | fails 3:1, hence the `onPanelDim` ring (12.5:1 on night) |
| category inks on white | 7.3–9.9 | `BarChart` in light mode and on receipts |
| category inks on night2 | 1.7–2.3 | fail, hence tints in dark mode |
| category tints on night2 | 12.4–15.0 | `BarChart` fills in dark mode |
| cobalt on moon | 6.7 | the `UndoBar` action in dark mode (see section 7) |

### 4.11 Open questions (need the user's call before building)

1. **Friends hero in highlighter both ways?** Should the Friends hero use highlighter in both directions (4.5), instead of good/bad colour?
2. **Treats Marker:** should the Treats Marker be dropped? (Dark `primary` and `accent` are settled: both periwinkle, 16 and 17 Oct 2026.)
3. **Category limits free or Pro?** Spec 4.2 says they "exist already"; spec 8 makes "multiple budgets" Pro.
4. **Nudges inside their cards?** Should rent and pace nudges live inside their own cards on Home (4.2)?
5. **Share image link:** does the share image get a URL or handle? The domain isn't settled (spec 11).
6. **Are by-item splits and full Wrapped still Pro?** Spec 8 says yes, and the concepts lock them. The paywall the user chose lists only receipts, the unlimited assistant and subscription reminders.

## 5. Voice

The voice is a friendly older cousin who's good with money.
- **Short:** one sentence, under about 12 words where possible.
- **Plain words, no finance jargon:** "safe to spend", not "discretionary balance".
- **Never shames:**
  - "$12 over, no stress."
  - "Cook tonight?"
- **No emoji.** Not in app copy, notifications, share images or docs. Words carry the tone; where a picture helps, use a system icon (SF Symbols via `expo-symbols`, Material on Android) with an accessibility label. Spec copy that has emoji is written without them here.
- **Numbers carry the message.** Format them through `money(cents / 100, currency, locale)` from the profile, never by hand.

## 6. Accessibility checklist (every screen)

- [ ] Every text/background pair is from section 2. Don't eyeball new ones; add them to the contrast table first.
- [ ] Taps are ≥ 48 pt, using `hitSlop` on icons.
- [ ] Roles are set: `button`, `header` (hero numbers), `radio`/`radiogroup`, `progressbar`, `accessibilityLabel` on icon-only buttons ("Delete Lunch").
- [ ] Status is never shown by colour alone.
- [ ] The screen works at 200% text size, with VoiceOver and TalkBack, in dark mode, and with Reduce Motion on.
- [ ] Amounts use `money` and tabular figures.

## 7. Not done yet (on purpose)

- **Dotted-notebook background.** Still left out. `react-native-svg` is needed from Phase 1 anyway, for `Bud`, `TreatJar` and the torn edges on `ReceiptCard`, so add it then; the background can follow if it's worth it.
- **No custom font or icon set yet.** Use system symbols (never emoji) until an icon set is chosen. The one illustration is Bud (4.0); don't add others without a reason. `expo-symbols` is already installed for SF Symbols on iOS.
- **Large text checked on iOS only.** At the largest accessibility size on the iPhone 17 simulator, Home and Activity wrap correctly. That's after three fixes: `Row` wraps, inputs drop their fixed line height, and the hero number is capped at 1.3× and shrinks to fit. Android at large font scale is not checked yet.
- **`money` minor digits:** verified on iOS Hermes (KRW). Android is inferred, since it matched Node in every Phase 0 `Intl` probe.
- **Android cold start shows one light frame** before Dark applies (likely Android recreating the activity on the night-mode change). iOS starts dark. Not fixed.
- **Wrapped captions** are templates from the numbers; spec 4.9 has the AI write them once the assistant is on OpenRouter. No Home nudge on the 1st yet; Wrapped opens from Budgets.
- **Assistant keyboard layout** not checked with a full soft keyboard (the iOS simulator uses the hardware keyboard; the Android emulator's is in floating stylus mode).
