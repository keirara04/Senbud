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
| `accent` | `#1f3fd8` cobalt | `#eeff5a` highlighter | Links, selected states, primary buttons |
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
- **Elevation:** none. Cards are flat colour on paper, like the web. Use shadows only for things that float over content, such as the assistant button and bottom sheets.

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
| `UndoBar` | `message`, `onUndo` | Ink bar with a highlighter "Undo". Shows for `motion.undoMs` (5 s) after any reversible write. Announced politely to screen readers. |
| `useNavigationTheme()` | – | React Navigation theme built from ours, passed to `ThemeProvider` in `_layout.tsx`. Headers, back buttons and screen backgrounds follow the system scheme live. |

**Building new components:** compose these first. If something new is needed, put it in `ui.tsx`, take colours from `useTheme()`, and add a row to this table.

## 4. Screens (spec section 6)

Each screen gets one job, one hero element, and a plain sentence explaining it.

**Concepts:** `docs/concepts/senbud-app-screens.html` draws every screen below at real size (375 pt wide) in light and dark, with Malaysian example data. Open it in a browser and use the theme switch at the top. Screens marked "Concept" are drawn there but not built, and the decisions in 4.1–4.10 are proposals until the user signs them off (open questions in 4.11).

| Screen | Hero (one per screen) | Content, top to bottom | Status |
|---|---|---|---|
| **Setup** (first run, later "Budget and rent") | `title`: "How much can you spend?" | Period `Segmented`, budget `Field`, rent amount and due day, currency, `Save`, `danger` "Erase all data" | Built |
| **Home** | `panel` with `hero` safe-to-spend in highlighter | Rent card, pace card, today's nudge, pinned `CaptureBar` (see 4.2) | Built; v2 concept |
| **Activity** | none; it's a list | Cards with label, `CategoryChip`, date, amount, delete. Later: filter chips, including "added by assistant". | Built |
| **Budgets** | `panel` with what's left in highlighter and `Progress tone="panel"` | Category rows with `Progress` and amounts; rent and bills list with due days; detected subscriptions | Concept |
| **Can I afford it?** | `panel`: verdict in words, key number in highlighter | Price `Field`, optional "What is it?", treat price picks, hours of work under a hairline | Concept |
| **Friends** | Net balance `hero` in highlighter, direction in words | Per-friend rows; friend sheet with copy-a-reminder and "Mark paid"; split flow with `Segmented` and `PersonToggle` | Concept |
| **Treats** | Jar balance `hero` with `highlight` "Add to jar" inside the panel | Treat list with "every N days" and status, short history, month-end leftover sheet | Concept |
| **Wrapped** | One stat per page, full-bleed `panel` | `StoryPager`, `BarChart` on a `ReceiptCard`, share image | Concept (later phase) |
| **Settings** | none | Grouped `ListRow`s: Money, AI, Look, Your data, Senbud Pro, then `danger` Erase | Concept |
| **Senbud Pro paywall** | selected plan as `panel`; the buy button is the one `highlight` | Title, three benefits, plan radio group, buy button, small print with Terms, Privacy, Restore (see 4.8b) | Concept; code in `pro.tsx` on `claude/senbud-pro` |
| **Assistant** | – | `AssistantFab` opens a native form sheet with chat | Concept (Phase 2) |

**Empty states:**
- One sentence with a concrete example of what to do: "Type 'lunch 12' on Home to add your first expense."
- No illustrations needed.

**Errors:**
- Shown inline, under the field, saying how to fix it.
- Destructive confirmations use the native alert. The red button names the action ("Erase") and the body says what's lost.

### 4.1 Navigation (all screens)

- **Native tab bar with 4 tabs:** Home, Budgets, Friends, Treats. Expo Router tabs with SF Symbols (`house`, `chart.bar`, `person.2`, `gift`) and Material icons on Android. Tint is `accent`. The OS sets sizes, labels and Dynamic Type.
- **Pushed, not tabs:**
  - Activity, from the pace card's "See activity".
  - Can I afford it?, from Home.
  - Wrapped, from the Home nudge on the 1st and from Budgets → Past recaps.
  - Settings, from the button at the top right of Home.
- **Titles:** tab roots other than Home use large titles. Home has no title; the date label sits in the nav bar and the panel is the first thing you see.
- **Assistant button:** on every screen except Home (where `CaptureBar` does the job), Can I afford it?, Wrapped, and while a sheet or the keyboard is up. Lists get a 72 pt bottom inset so their last row clears it.

### 4.2 Home v2

- **Top to bottom:**
  1. Date label and Settings button.
  2. `panel`: safe to spend today.
  3. Rent card.
  4. Pace card, with "See activity".
  5. Today's nudge (`NudgeCard`), only when there is one.
  6. "Can I afford it?" `TextButton`.
  7. `CaptureBar`, pinned above the tab bar. `UndoBar` floats just above it.
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
- **First day:** the empty-state line sits right above the bar: "Type what you spent below, like 'nasi lemak 6.50'. Senbud does the rest." The field shows focus.

### 4.3 Budgets

- **Hero:** `panel` with the period label ("October · monthly"), what's left in highlighter, `Progress tone="panel"`, and "RM 498 of RM 1,400 spent. On track, 16 days to go."
- **By category:**
  - One `List` with a row per category: chip, "RM 248 of 400", and a bar.
  - A words line only when the category is close or over ("RM 24 left for 15 days." / "RM 12 over, no stress. Borrow from Treat?").
  - Categories with no limit show the amount only.
- **By category: alternatives under review.** The chip-and-bar list reads as generic. The concept page ("By category") draws three other options; pick one before building:
  - **A. Stamp card ledger (recommended):** a `ReceiptCard` with dotted leaders and 10 stamps per limit. Filled stamps are the category ink (the receipt is white in both themes). Over budget adds a coral stamp outside the card.
  - **B. Where it went:** one tape for the whole budget, with category segments, hatched rent and bills, and blank paper for what's left. A short legend ledger with the limits sits under it.
  - **C. Pace ruler:** a thin bar per category with a pen tick at today's even-spending point, and words for "ahead of" or "on" pace.
- **Rent and bills:**
  - A `List` with due day and countdown, then `+ Add a bill`.
  - The caption under it says how much is set aside: "RM 492.90 is set aside and never counts as spendable."
- **Detected subscription (Pro):** a card that asks first: "Netflix charged RM 17 on 3 Sep and 3 Oct. Is it a subscription?" with "Not really" / "Yes, track it".
- **Budget settings rows:** Period, Until payday (`ProLock`), Past recaps.
- **Over:** the category bar goes coral and its line says so in `bad` ink. The panel never turns red.
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
  - `secondary` "Copy message", with "Senbud never sends anything. Paste it into WhatsApp yourself."
  - `primary` "Mark paid", which shows `UndoBar`.
- **Split screen:**
  - `Segmented` Even / By item / Amounts.
  - By item (Pro) shows the AI-read receipt on a `ReceiptCard`: one row per item with name, price and one `PersonToggle` per person. Shared items (all toggles on) split evenly.
  - Per-person totals sit under the receipt, then `primary` "Save split".
  - Your share becomes an expense; the rest become IOUs (`iousFromSplit`).
- **Empty:** "Paid for the group? Snap the receipt, or type something like 'dinner 45 with Aiman and Sarah'." with "Friends are just names. Senbud doesn't read your contacts."

### 4.6 Treats

- **Hero:**
  - `panel` with the jar total in highlighter.
  - A caption in treats: "= 4 Tealives or 2 movies at GSC".
  - `highlight` "Add to jar" *inside* the panel, so the screen has one yellow zone.
- **The `Marker` on the jar name is dropped:** it would be a second yellow thing.
- **Your treats** list:
  - Name, your own last price, and "every N days · last 9 days ago".
  - Status in words: "Fits today" in `good`, or "Next in 9 days" in `textDim`.
- **History:** a short list with "See all".
- **Month-end leftover:**
  - A sheet on the 1st (or reached from the Home nudge): "September's done. You finished RM 38 under budget. Move it to the treat jar?"
  - `primary` "Move RM 38 to the jar" and `secondary` "Keep it in October's budget".
  - In dark mode `primary` and `highlight` look the same (section 7). On this screen that's acceptable, because the sheet covers the panel.
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
  2. "When you ask a question": proposed as the question plus a short summary (budget, what's left, rent date, this month's category totals), never the full list. Needs sign-off.
  3. "Never leaves the phone": expenses, friends' names, treats and the jar.
  - Then the same `Switch` again.
- **Erase:**
  - Native alert: "Erase all data?" / "This deletes every expense, budget, IOU and treat on this phone. Export first if you want a copy. It can't be undone."
  - Buttons: Cancel and a destructive "Erase".

### 4.8b Senbud Pro paywall

- **Opened from:** Settings → "See plans", any `ProLock`, and the camera for free users. A full-screen modal with Close (48 pt) at the top right. There's no tab bar and no assistant button.
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

- **`AssistantFab`:** bottom right, 16 pt above the tab bar.
- **Sheet:**
  - Native form sheet at the medium detent; drag up for full height.
  - Title "Ask Senbud" and Close.
  - Chat bubbles.
  - Suggestion picks: "How's my week?", "Can I afford…", "Set a budget".
  - Input row: camera, field "Ask or add…", and a send button that is `accent` when there's text and `surfaceSunken` when empty.
- **Answers reuse the rules.** "Can I afford" gives the same verdict and copy as 4.4. A quick add answers "Added 2 items, RM 16.50. Undo". In the sheet nothing is in highlighter; the screen behind keeps its hero.
- **Asks first when unsure:** "Split RM 32 evenly? You'd spend RM 16, and Aiman would owe you RM 16." with `secondary` "Just mine" / `primary` "Yes, split it".
- **AI off:** "AI is off, so I can't answer questions. Quick adds still work, like 'kopi 4.50'." with `secondary` "Turn on AI in Settings". The camera button is hidden, and the field's placeholder becomes "kopi 4.50, grab 12".
- **Offline:** "Can't reach Senbud right now. Anything you add is still saved on your phone." with a "Try again" `TextButton`. Plain text, never red.

### 4.10 Proposed components

These are additions to `ui.tsx` for the screens above. Each takes colours from `useTheme()`, keeps 48 pt taps, and gets a row in the section 3 table when it's built. Native first; the only new dependency is `react-native-svg` for `ReceiptCard`.

| Component | Props and variants | States and rules |
|---|---|---|
| `Tabs` (native) | Expo Router tabs | SF Symbols / Material icons, `accent` tint, OS sizing. 4 tabs (4.1). |
| `NudgeCard` | `message`, `actions` (≤ 2), `onDismiss` | Surface card, "Today" `label`, one sentence, `TextButton`s. One a day at most; core picks it. Not a live region. |
| `CaptureBar` | `onSnap`, `onSubmit(text)`, `onManual` | Pinned above the tab bar; rises with the keyboard. 48 pt icon buttons labelled "Snap a receipt" and "Add by hand". Amounts → `parseSpending` + `UndoBar`; questions → assistant sheet; camera without Pro → Pro screen. |
| `Sheet` | Expo Router `presentation: 'formSheet'`, detents medium/large | `surface`, `radius.lg`, grabber, shadow (it floats). No JS sheet library. |
| `AmountPad` | `value`, `onChange`, `currency` | 3×4 keys ≥ 48 pt; the decimal key is hidden for zero-decimal currencies (KRW, JPY). Keys are buttons; ⌫ is labelled "Delete". Light haptic on press. |
| `List` + `ListRow` | `label`, `value`, `accessory` (chevron / `Switch` / none), `onPress` | Inset grouped, min 52 pt rows, hairline separators inset 16. At large text the value wraps under the label. |
| `Switch` | RN `Switch` | `trackColor.true = accent`, `thumbColor = surface` (7.6:1 light, 15:1 dark). |
| `Progress tone="panel"` | as `Progress` | Track is white at 22% on cobalt. Fills are mint, amber, and **coralLight** for over (plain coral is 2.7:1 on cobalt). Still paired with words. |
| `PersonToggle` | `name`, `on`, `onToggle` | 48 pt circle with initials. Off: outline, `textDim`. On: `accent` fill. Role `checkbox`, label "Aiman had Roti canai". On a `ReceiptCard` it uses the light-scheme colours, since the receipt is always white. |
| `Avatar` | `name` | 40 pt initials circle on `surfaceSunken`. Never a photo; no contacts access. |
| `AssistantFab` | `onPress` | 56 pt `panel` circle, chat glyph in `onPanel`, shadow. Dark mode adds a 1.5 pt `onPanelDim` ring. Label "Ask Senbud". Hidden where 4.1 says. |
| `StoryPager` | `pages`, `onClose` | Full-bleed `panel` pages with segment bars. Tap the halves to move, swipe down to close, no autoplay, cuts under Reduce Motion. Each page is one accessibility element read as a sentence. |
| `BarChart` | `data: {category, share}[]` (≤ 6) | Horizontal, sorted, with the % as text on every bar. Fill is the category **ink** on white or a receipt, and the category **tint** on a dark `surface`. |
| `ReceiptCard` | `children` | White in both schemes with zig-zag torn edges (the web's `.receipt`), via `react-native-svg`. The share image is captured with `react-native-view-shot` and sent to the native share sheet. |
| `ProLock` | `onPress` | Grey `Other`-style chip with a lock and "Pro" next to a locked option. Opens the paywall (`pro.tsx`). It never hides the option. |
| `ChatBubble` | `from: 'me' \| 'senbud'` | Yours: `panel` fill, `onPanel` text, right-aligned (cobalt in both schemes; `accent` would turn every bubble yellow in dark mode). Senbud's: `bg` fill, left-aligned. Inline actions are `TextButton`s; confirmations are a `Button` pair under the bubble. |

**Contrast added by these components** (add to 2.2 when built):

| Pair | Ratio | Note |
|---|---|---|
| mint on cobalt | 4.0 | `Progress tone="panel"` fill (non-text, needs 3:1) |
| amber on cobalt | 4.7 | same |
| coralLight on cobalt | 3.3 | same; plain coral is 2.7 and fails |
| cobalt FAB on night | 2.4 | fails 3:1, hence the `onPanelDim` ring (12.5:1 on night) |
| category inks on white | 7.3–9.9 | `BarChart` in light mode and on receipts |
| category inks on night2 | 1.7–2.3 | fail, hence tints in dark mode |
| category tints on night2 | 12.4–15.0 | `BarChart` fills in dark mode |
| cobalt on moon | 6.7 | the `UndoBar` action in dark mode (see section 7) |

### 4.11 Open questions (need the user's call before building)

1. **Tab bar?** Is the 4-tab bar in 4.1 right, or should the app stay a single stack with links from Home?
2. **Assistant button on Home?** Is it OK to have no assistant button on Home? The spec says every screen, and the capture bar does the job there.
3. **Friends hero in highlighter both ways?** Should the Friends hero use highlighter in both directions (4.5), instead of good/bad colour?
4. **Treats Marker and dark `primary`:** should the Treats Marker be dropped? And should dark `primary` get its own fill? In dark mode `accent` is highlighter, so every `primary` button is yellow: Friends ("Split a bill", "Mark paid") and the assistant's "Yes, split it" show two yellow things on one screen.
5. **Category limits free or Pro?** Spec 4.2 says they "exist already"; spec 8 makes "multiple budgets" Pro.
6. **What does a chat question send?** Only the proposed summary, or more? This decides the privacy copy and the store data forms.
7. **Nudges inside their cards?** Should rent and pace nudges live inside their own cards on Home (4.2)?
8. **Share image link:** does the share image get a URL or handle? The domain isn't settled (spec 11).
9. **Are by-item splits and full Wrapped still Pro?** Spec 8 says yes, and the concepts lock them. The paywall the user chose lists only receipts, the unlimited assistant and subscription reminders.

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

- **Dotted-notebook background and torn receipt edges.** They need `react-native-svg`, which isn't worth adding for decoration yet. Revisit for Wrapped share images.
- **No custom font, icon set or illustration style yet.** Use system symbols (never emoji) until an icon set is chosen. `expo-symbols` is already installed for SF Symbols on iOS.
- **In dark mode, `primary` and `highlight` buttons look the same** (both highlighter yellow), so the "single most important action" emphasis disappears at night. Accepted for now. If a screen ever needs both, give dark `primary` its own fill.
- **Large text checked on iOS only.** At the largest accessibility size on the iPhone 17 simulator, Home and Activity wrap correctly. That's after three fixes: `Row` wraps, inputs drop their fixed line height, and the hero number is capped at 1.3× and shrinks to fit. Android at large font scale is not checked yet.
- **`money` minor digits:** verified on iOS Hermes (KRW). Android is inferred, since it matched Node in every Phase 0 `Intl` probe.
- **No user-selectable theme.** The app follows the system setting (`userInterfaceStyle: automatic`). Settings gets a light/dark/system choice in Phase 1. Drawn in 4.8.
- **`UndoBar` action is unreadable in dark mode.** The bar fills with `text` (moon, `#eef0ff`) and the "Undo" button uses `highlight` (`#eeff5a`): 1.0:1. Light mode is fine (15:1 on ink). Fix: in dark mode, use `accent`'s light value, cobalt (6.7:1 on moon). The concepts page already draws it that way. Not changed in `ui.tsx` yet.
