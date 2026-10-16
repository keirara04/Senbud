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

| Screen | Hero (one per screen) | Content, top to bottom | Status |
|---|---|---|---|
| **Setup** (first run, later "Budget & rent") | `title`: "How much can you spend?" | Period `Segmented`, budget `Field`, rent amount and due day, currency, `Save`, `danger` "Erase all data" | Built |
| **Home** | `panel` with `hero` safe-to-spend in highlighter | Rent card ("🏠 Rent $650 in 6 days — you're covered."), pace card (`Progress` + spec 4.2 copy), quick add `Field` + `UndoBar`, links | Built |
| **Activity** | none; it's a list | Cards with label, `CategoryChip`, date, amount, delete. Later: filter chips, including "added by assistant". | Built |
| **Budgets** | `Progress` for the overall budget | Category rows with `Progress` and amounts; rent and bills list with due days | Phase 1 |
| **Can I afford it?** | `hero` verdict amount on `panel` | Price `Field`, verdict sentence ("Yes, go for it." / "Doable, but tight." / "Not this week."), hours of work in `caption` | Phase 1 |
| **Friends** | Net balance (`hero`, `good` if owed, `bad` if you owe) | Per-friend rows with "Settle up" `secondary`; split flow uses `Segmented` (even / by item) and owner chips | Phase 1 |
| **Treats** | Jar balance `hero` with `Marker` on the jar name | Treat list with "every N days", history, `highlight` "Add to jar" | Phase 1 |
| **Wrapped** | One stat per page, full-bleed `panel` | Swipeable cards; category colours from 2.3; share image | Later |
| **Settings** | none | Grouped rows: currency, hourly rate, AI on/off with "what gets sent", export, theme, `danger` erase | Phase 1 |
| **Assistant** | – | Floating 56 pt cobalt button, bottom right, on every screen, with a shadow (it floats). Opens a bottom sheet (`radius.lg`). | Phase 2 |

**Empty states:**
- One sentence with a concrete example of what to do: "Type 'lunch 12' on Home to add your first expense."
- No illustrations needed.

**Errors:**
- Shown inline, under the field, saying how to fix it.
- Destructive confirmations use the native alert. The red button names the action ("Erase") and the body says what's lost.

## 5. Voice

The voice is a friendly older cousin who's good with money.
- **Short:** one sentence, under about 12 words where possible.
- **Plain words, no finance jargon:** "safe to spend", not "discretionary balance".
- **Never shames:**
  - "$12 over, no stress."
  - "Cook tonight? 🍳"
  - At most one emoji in a line, and only where the spec has one.
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
- **No custom font, icon set or illustration style yet.** Use emoji sparingly and system symbols when an icon set is chosen. `expo-symbols` is already installed for SF Symbols on iOS.
- **No user-selectable theme.** The app follows the system setting (`userInterfaceStyle: automatic`). Settings gets a light/dark/system choice in Phase 1.
