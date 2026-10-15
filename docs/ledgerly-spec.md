# Ledgerly: product spec v1

Status: brainstorm locked, no code yet. Date: 16 October 2026.

> **Pitch:** The money buddy for students. Snap your spending or type it in, and it handles the rest. It tells you when rent is coming and when you can actually afford that Big Mac.

---

## 1. Decisions

| Area | Decision |
|---|---|
| Platform | Web app first, installable as a PWA |
| Target | Students first; anyone can use it |
| Personality | Friendly, short, slightly cheeky, never preachy |
| Saving | Auto-save with a 5-second Undo; ask first when unsure |
| Bank sync | Not now. Decide after launch. Marketing says "No bank password needed" |
| Manual entry | First-class, always free, works with AI turned off |
| Proactive nudges | At most 1 a day. Rules decide; AI only writes the sentence |

---

## 2. Core loop

```
CAPTURE ──► UNDERSTAND ──► DECIDE ──► repeat
"I spent"    "where am I?"   "what now?"
```

---

## 3. Pipeline

```
INPUT
 📸 photo/receipt · 🖼️ screenshot · 💬 quick text · 📄 CSV · ✍️ manual form
   │
   ├─ manual ─────────────────────────────────────────────┐
   ▼                                                        │
ASSISTANT: extract → categorize → check (dupe / weird / unsure)
   │                                                        │
   ├─ confident → auto-save + "Added $12 Dining 🍔 [Undo]"   │
   └─ unsure (blurry, unknown merchant, > $100) → ask 1 tap │
   ▼                                                        ▼
LOCAL STORE (browser) ◄─────────────────────────────────────┘
   │
LEARN: merchant→category rules, your treats + their prices, recurring charges
   │
MONEY BRAIN (rules, no AI)
   ├─ Budget → safe to spend today
   ├─ Rent countdown (protected first)
   ├─ Treat jar + treat nudges
   ├─ Subscriptions
   └─ Splits / IOUs
   │
NUDGE (max 1/day) → AI phrases it friendly
```

**AI sees:** the input, plus a small summary: this period's totals, budget state, and the last 20 transactions.
**AI never sees:** the full ledger history or any bank credentials. Nothing is stored on a Ledgerly server.

---

## 4. Features

### 4.1 Capture (exists, plus AI)
- **Manual:** opens straight to the amount keypad, then category chips. Today's date and the last category are pre-filled. Favourites ("Kopi $4") and "repeat last". `N` / `Enter` / `Esc` on desktop.
- **Quick text:** "grab 8 kopi 4 netflix" becomes 3 entries.
- **Photo or screenshot:** a vision model reads the merchant, amount, date and items.
- **CSV:** exists; bank presets come later.

### 4.2 Budgets (new: overall limit)
- **Overall limit:** weekly, monthly or "until payday" (e.g. $100/week, $1,000/month).
- **Category limits:** these exist already.
- **Setup:** by chat ("I only want to spend 100 this week"), on the Budgets screen, or during onboarding.
- **Pace reminders:**
  - Stay quiet while on track.
  - Warn when spending runs ahead of time elapsed: "$70 of $100 gone and it's only Wednesday."
  - At 90% used: "$10 left. Cook tonight? 🍳"
  - When over: "$12 over, no stress. Borrow from next week?"
  - When the week ends under budget, offer to send the leftover to the treat jar.

### 4.3 Rent countdown (new)
- The user sets the rent amount and due day (and optionally other fixed bills).
- Main card: "🏠 Rent $650 in 6 days — you're covered."
- Rent money is set aside first and never counted as spendable.

### 4.4 Safe to spend today (new, the main number)
```
safe_today = (budget_left − upcoming_fixed_bills_in_period) ÷ days_left_in_period
```
- Shown as the main figure on the dashboard. It drives "Can I afford it?" and the treat nudges.

### 4.5 ⭐ Can I afford it? (new)
- **Ask:** "Can I buy a $40 concert ticket?", or tap "Can I afford…" and enter an amount.
- **Rules decide the answer:**
  - **Yes:** the price fits within budget_left after rent. "Yes! You'd still have $8/day till Sunday 🎉"
  - **Tight:** it fits, but safe_today drops below about 30% of normal. "Doable, but tight: $3/day after. Wait till payday on the 25th?"
  - **No:** it doesn't fit, or it would eat into rent. "Not this week 😅 Rent's in 6 days. Next week it fits."
- The answer is also shown in hours of work (4.6).

### 4.6 ⭐ Price per hour of work (new)
- **Setup:** "I earn $12/hour" (part-time). It's optional, and an allowance-only user can skip it.
- Shown on "Can I afford it?" answers, large purchases, and the Wrapped recap: "$60 sneakers = 5 hrs of work 👟"
- Calculation: price ÷ hourly rate, rounded to 0.5 hours.

### 4.7 ⭐ Split with friends from a receipt (new)
- **Input:** a photo of the group receipt plus "split with Aiman and Sarah, I paid", or a manual split.
- **Modes:**
  - **Even:** split the total equally.
  - **By item:** the AI lists the receipt items and you tap who had what.
  - **Custom amounts.**
- **What gets saved:**
  - Your share is recorded as your expense.
  - What others owe is recorded as IOUs, which don't count as spending.
- **IOU list:** "Sarah owes you $14 (Friday dinner)". Mark it paid with one tap.
- **Friendly reminder:** a pre-written message to copy: "Hey Sarah! Friday dinner was $14 😊". The app never sends anything itself.
- **Friends:** just names. No accounts, no contacts access.

### 4.8 ⭐ Treat jar + treat nudges (new)
- **Treats:** items the user marks as treats, or that the app learns from repeated purchases (Big Mac, bubble tea, Starbucks).
- **Treat price:** taken from the user's own history ("last Big Mac $5.99"), never guessed by AI.
- **Treat jar:** leftover weekly budget can roll into it. "Treat jar: $23 = 4 Big Macs 🍔 or 1 movie night 🎬"
- **Treat nudge:** shows only when all three are true: the treat fits today's safe-to-spend, rent is covered, and it's been at least N days since the last one.
  - Example: "It's been 3 weeks since a Big Mac. $5.99 fits today. Treat yourself? 🍔"

### 4.9 ⭐ Wrapped recap (new)
- **Monthly** (plus a year-end edition). A swipeable story of 5–7 cards, with a shareable image.
- **Cards:**
  - total spent vs budget
  - top category
  - top place ("7-Eleven, 31 visits 😂")
  - treats eaten
  - hours of work spent
  - money saved
  - best streak
- **Privacy:** the share image shows no amounts by default; percentages and fun facts only, and amounts only if you switch them on.
- AI writes the captions; the numbers come from the local data.

### 4.10 ⭐ Subscription detection (new)
- **Detected when:** the same merchant appears with a similar amount (±10%) at a regular interval (weekly, monthly or yearly), at least 2 times.
- **The user confirms it** ("Is Spotify a subscription?"), after which it's tracked.
- **Card:** "🔁 You pay $34/month in subscriptions."
- **Renewal nudge:** "Spotify renews tomorrow ($11.99)."
- **Optional unused prompt:** "Haven't marked Netflix as watched in 6 weeks. Still using it?" This needs a user tap, so it's optional.
- Upcoming subscriptions count as fixed bills in safe_today.

---

## 5. Nudge priority (max 1 a day, highest wins)

1. Rent is due soon and not covered
2. Over budget, or spending pace well ahead
3. A subscription renews tomorrow
4. An IOU older than 7 days
5. A treat nudge, only when everything is fine
6. Otherwise nothing

Weekly recap: Sunday evening. Wrapped: on the 1st of each month.

---

## 6. Screens

1. **Home:**
   - Safe to spend today
   - Rent countdown card
   - Budget pace bar
   - Today's nudge
   - Quick capture bar (📸 / 💬 / ✍️)
2. **Activity:** transactions, with a filter for items added by the assistant.
3. **Budgets:** overall and category budgets, rent and bills.
4. **Friends:** IOUs and splits.
5. **Treats:** the jar, treat list and history.
6. **Wrapped:** the current and past recaps.
7. **Settings:**
   - AI on/off and a note on what gets sent
   - hourly rate
   - currency
   - export/backup
   - theme

**Assistant:** a floating chat button on every screen.

---

## 7. Data (local)

New stores on top of the existing transactions and category budgets:

- **budget:**
  - `period`: week, month or until-date
  - `limit`
  - `startDay`
- **bills:** rent and fixed bills, each with `name`, `amount` and `dueDay`
- **treats:** `name`, `lastPrice`, `lastDate`, `minDaysBetween`
- **treatJar:**
  - `balance`
  - history: `amount` and `date` for each entry
- **ious:** `friend`, `amount`, `direction`, `note`, `date`, `paid`
- **subscriptions:** `merchant`, `amount`, `interval`, `nextDate`, `confirmed`
- **rules:** merchant → category
- **profile:** `hourlyRate`, `payday`, `currency`, `aiEnabled`
- **Transactions get new fields:**
  - `source`: manual, text, photo or csv
  - `mood`: optional
  - `splitId`: optional

---

## 8. Free vs Pro

| Free | Pro |
|---|---|
| Manual entry + quick text | Photo/screenshot AI capture |
| 1 overall budget + reminders | Multiple budgets, until-payday, carry-over |
| Rent countdown, safe to spend, Can I afford it, hours of work | Receipt splitting by item |
| Manual splits + IOUs | Subscription detection + renewal nudges |
| Treat jar | Full Wrapped + year-end edition |
| Basic monthly Wrapped | Encrypted sync (later) |

---

## 9. Build order

1. **Money brain:** budget period, rent and bills, the safe-to-spend formula, nudge priority. Rules only, no AI.
2. **Can I afford it? + hours of work:** both reuse step 1, so they're cheap.
3. **Treat jar + treat nudges.**
4. **Assistant:** quick text, then photo capture, auto-save with Undo. Uses OpenRouter with the user's own key first.
5. **Splits + IOUs:** manual first, then receipt item splitting.
6. **Subscription detection.**
7. **Wrapped recap + share image.**

## 10. Tech stack (decided)

**Project folder:** `~/VS CODE/Ledgerly/`, with `web/` (Next.js) and `api/` (Laravel). This is the same layout as MakanApa.

### Frontend: `web/`
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript, built as static files (`output: "export"`) |
| Styling | Tailwind CSS (Ledgerly's current look as design tokens) |
| Marketing / SEO | `(marketing)/` routes pre-rendered to static HTML, including `alternatives/[slug]` via `generateStaticParams` |
| App | `/app/*`, runs entirely in the browser (`"use client"`) |
| Local data | Dexie (IndexedDB) |
| Money logic | `lib/money/` as plain TypeScript (safe to spend, can I afford it, treats, subscriptions, splits), tested with Vitest |
| AI tool checks | Zod |
| PWA + push | Serwist service worker + Web Push |
| Serving | nginx in Docker (static files) |

### Backend: `api/` (Laravel)
| Job | How |
|---|---|
| AI proxy | `POST /v1/agent`, which forwards to OpenRouter with Laravel's HTTP client. Uses a model allowlist, a max_tokens cap and the `RateLimiter` (per licence or per device ID). |
| Payments | `POST /v1/webhooks/polar`. Verifies the signature, then issues a licence key. Only the key's hash is stored. |
| Licence check | `POST /v1/licence/validate`, which returns a signed entitlement the app caches for 7–14 days. |
| Nudges | Laravel scheduler + queue + Web Push (`laravel-notification-channels/webpush`). The app sends only the nudge text and time it has already worked out, never the ledger. |
| Auth | No user accounts. Requests are identified by licence key or an anonymous device ID. |
| Storage | Postgres or MySQL for licences, push subscriptions and rate-limit counters only. No transactions. |

### Deployment
- Self-hosted with Docker: one container for `web` (nginx serving the static files) and one for `api` (Laravel + queue worker + scheduler).
- Domains: `ledgerly.app` (web) and `api.ledgerly.app` (Laravel). CORS is restricted to the web domain.
- Secrets live in the server's environment: the OpenRouter key, the Polar webhook secret, the keys for signing licences, and the Web Push keys.

### Rules
- Financial data never reaches the server. `/v1/agent` receives only what a single request needs, and the API doesn't log request contents.
- The app works fully offline without the API. Only AI features, payments and push need it.

## 11. Still open
- **Bank sync:** decide after launch.
- **Name and branding:** check whether "Ledgerly" is free (domain, trademark).
- **Onboarding:** under 60 seconds to get budget, rent and payday set.
- **Proxy vs users' own key** for AI in production.
