# Senbud: store privacy answers

These are draft answers for the **App Store privacy label** (App Store Connect → App Privacy) and the **Google Play Data safety** form (Play Console → App content).

- They describe the app with local-first storage, receipt reading through `POST /v1/agent/receipt`, questions to Bud through `POST /v1/agent/ask`, and Wrapped captions through `POST /v1/agent/caption`.
- **Re-check them whenever a feature sends anything off the phone.**
- They're drafts. The store definitions are summarised from Apple's and Google's help pages and should be checked at submission. **PRO:** have them reviewed before launch.

## What leaves the phone

| Data | When | Where it goes | Kept? |
|---|---|---|---|
| Expenses, budgets, bills, profile | Never | Stays in SQLite on the phone | Only on the phone. "Erase all data" deletes it. |
| Receipt photo | Only when the person taps Snap a receipt, after the "Bud uses AI" sheet | Senbud API, then OpenRouter, then the model provider (currently Google Gemini) | **No.** It's held in memory for that one request only. Nothing is written to disk, queues or logs (`api/app/Http/Controllers/ReceiptController.php`). OpenRouter is asked for zero-data-retention endpoints only (`provider.zdr`, `data_collection: deny`), and OpenRouter itself stores no prompts unless the account opts in. |
| Question to Bud, plus a spending summary: the question, up to 4 earlier questions and answers, up to 5 lines the person kept with "Bud remembers" (Pro, 120 characters each), this period's totals by category, budget, rent and upcoming bills, and up to 20 of this period's expenses (date, label, amount, category). Planned (P3.8, covered by the 18 Oct 2026 consent text): when a question needs them, bills, category limits, treat jar progress and past months' totals, asked from the phone | Only when the person asks Bud something in their own words, after the "Bud uses AI" sheet. Quick adds and the built-in answers never leave the phone | Senbud API, then OpenRouter, then the model provider (currently Anthropic's Claude Haiku, run by Google) | **No.** Same as photos: held in memory for that one request, not written or logged (`api/app/Http/Controllers/AskController.php` validates the exact shape and drops anything else). Same zero-data-retention OpenRouter settings. Expense labels are free text the person typed, so they can hold anything. |
| Wrapped numbers: share of budget used, top category (one of the six fixed names) and its share, amount kept or over, treat count, best streak, and whether it's a month or a year | Only when the person opens Wrapped with AI on and after agreeing to the "Bud uses AI" sheet. No labels, places or notes | Same as questions | **No.** Held in memory for that one request (`api/app/Http/Controllers/CaptionController.php` validates the exact shape: the category must be a fixed name, so no free text can ride along). Same zero-data-retention OpenRouter settings. |
| Currency code (e.g. "MYR") | With each receipt or question | Same as the photo | No |
| Anonymous device id (random UUID, not tied to the person or the hardware) | With each receipt or question | Senbud API only, in the `X-Device-Id` header | Yes: as hashed rate-limit counters in the server cache, for up to 24 hours. That includes the off-topic counter that pauses questions for the day. A new id is made on "Erase all data". |
| IP address | With each receipt or question (all HTTPS traffic) | Senbud API | Hashed per-IP rate-limit counter, up to 24 hours. Not logged with the request. |
| Purchases (Phase 2 C, RevenueCat) | When buying or restoring Pro | Apple / Google, plus RevenueCat | Yes. **Not built yet;** update these answers when it is. |

## Apple: App Privacy label

Apple counts data as **collected** only if it leaves the device and is kept longer than needed to answer the request in real time. On that test:

- **Photos:** *not collected.* Processed in real time and discarded. **Keep it that way:** any server-side storage, logging or retry queue for images changes this answer.
- **Questions and the spending summary, and Wrapped numbers** (Financial Info → Other Financial Info, User Content → Other User Content): *not collected*, on the same test. They are processed in real time for one answer and discarded. The same warning applies: storing chats, logging request bodies or keeping "conversation history" on the server changes this answer to collected, App Functionality, not linked, not tracking.
- **Device ID:** declare it, to be safe. **Identifiers → Device ID**:
  - purpose: App Functionality (rate limiting and abuse prevention)
  - **not linked to the user's identity**
  - **not used for tracking**
- **Purchase history (once RevenueCat ships):** **Purchases → Purchase History**, App Functionality, not linked, not tracking. RevenueCat's own privacy disclosure guide lists what its SDK sends; copy its answers at that point.
- **Tracking:** none. `NSPrivacyTracking` is false in `mobile/app.json`, and no tracking domains are listed.
- **Privacy manifest:** `expo.ios.privacyManifests` in `mobile/app.json` declares the required-reason APIs that the installed libraries use:
  - UserDefaults `CA92.1`
  - file timestamps `0A2A.1`, `3B52.1`, `C617.1`
  - system boot time `35F9.1`
  - disk space `85F4.1`, `E174.1`

  These were collected from every `PrivacyInfo.xcprivacy` under `node_modules`. **Re-run that collection after adding any native library.** The script is in "Phase 2 results" in `docs/senbud-mobile-audit.md`. Apple emails about anything missing after a TestFlight upload.

## Google Play: Data safety

Google counts anything sent off the device, so the photo must be declared even though it isn't kept.

| Section | Answer |
|---|---|
| Does the app collect or share any required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes.** HTTPS only; release builds must use an `https://` `EXPO_PUBLIC_API_URL`. |
| Can users ask for their data to be deleted? | **Yes.** "Erase all data" in the app. Nothing is kept server-side apart from rate-limit counters that expire within 24 hours. |
| **Photos and videos → Photos** | Collected: **yes.** Shared: **no** (OpenRouter and the model provider process it for Senbud as service providers, which Google doesn't count as sharing). **Processed ephemerally: yes.** Required or optional: **optional** (only if the person uses receipt reading). Purpose: **App functionality.** |
| **Financial info → Other financial info** (the spending summary and expenses sent with a question, and the numbers sent for Wrapped captions) | Collected: **yes.** Shared: **no** (OpenRouter and the model provider are service providers). **Processed ephemerally: yes.** Required or optional: **optional** (only if the person asks Bud a question, or opens Wrapped, with AI on). Purpose: **App functionality.** |
| **App activity → Other user-generated content** (the question, earlier turns, and "Bud remembers" lines) | Collected: **yes.** Shared: **no.** **Processed ephemerally: yes.** Required or optional: **optional.** Purpose: **App functionality.** |
| **Device or other IDs** | Collected: **yes.** Shared: **no.** Processed ephemerally: **no** (kept up to 24 hours). Required: **optional** (only sent with receipts and questions). Purpose: **App functionality, Fraud prevention, security and compliance.** |
| **Financial info → Purchase history** (once RevenueCat ships) | Collected: **yes**, via Play Billing and RevenueCat. Purpose: App functionality. Re-check against RevenueCat's Data safety guide. |
| Financial info → anything else | **No.** Expenses leave the phone only inside a question's summary, and Wrapped sends totals and shares only (above). |
| Location, contacts, messages, app activity, web browsing, audio, health, calendar, files | **No** |

## Things that would change these answers

- Logging request bodies, storing receipts or chats for "history", or a retry queue that persists images or questions.
- Sending more with a question (a longer expense list, other screens' data) than `AskController` validates today, or adding free text (labels, places) to Wrapped captions beyond what `CaptionController` validates.
- Analytics or crash reporting SDKs (none yet; see the audit's open gap on mobile analytics).
- Cloud backup or sync.
- RevenueCat, when Phase 2 C lands.
- Switching models or providers. Update the provider names on the "Bud uses AI" sheet in `mobile/src/consent.tsx` (What gets sent shows the same cards) and keep `provider.zdr`.

## Bud remembers and chat history (18 October 2026)

- Remembered lines and Bud chats are stored **on the phone** (`bud_memory`, `bud_chats`). Memory is in the person's own backup file; chats are not. Erase clears both.
- Up to 5 remembered lines go with a question, processed ephemerally like the question itself. The server never stores them, so the answers above stay "not collected" and "processed ephemerally". Storing them server-side, or syncing chats, would change that.
- The consent text changed the same day; consents from before 18 Oct 2026 are asked again (`AI_CONSENT_SINCE` in `mobile/src/db.ts`).

