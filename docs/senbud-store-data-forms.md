# Senbud: store privacy answers

These are draft answers for the **App Store privacy label** (App Store Connect → App Privacy) and the **Google Play Data safety** form (Play Console → App content).

- They describe the app as of Phase 2: local-first storage, plus receipt reading through `POST /v1/agent/receipt`.
- **Re-check them whenever a feature sends anything off the phone.**
- They're drafts. The store definitions are summarised from Apple's and Google's help pages and should be checked at submission. **PRO:** have them reviewed before launch.

## What leaves the phone

| Data | When | Where it goes | Kept? |
|---|---|---|---|
| Expenses, budgets, bills, profile | Never | Stays in SQLite on the phone | Only on the phone. "Erase all data" deletes it. |
| Receipt photo | Only when the person taps Snap a receipt, after the consent screen | Senbud API, then OpenRouter, then the model provider (currently Google Gemini) | **No.** It's held in memory for that one request only. Nothing is written to disk, queues or logs (`api/app/Http/Controllers/ReceiptController.php`). OpenRouter is asked for zero-data-retention endpoints only (`provider.zdr`, `data_collection: deny`), and OpenRouter itself stores no prompts unless the account opts in. |
| Currency code (e.g. "MYR") | With each receipt | Same as the photo | No |
| Anonymous device id (random UUID, not tied to the person or the hardware) | With each receipt | Senbud API only, in the `X-Device-Id` header | Yes: as a hashed rate-limit counter in the server cache, for up to 24 hours. A new one is made on "Erase all data". |
| IP address | With each receipt (all HTTPS traffic) | Senbud API | Hashed per-IP rate-limit counter, up to 24 hours. Not logged with the request. |
| Purchases (Phase 2 C, RevenueCat) | When buying or restoring Pro | Apple / Google, plus RevenueCat | Yes. **Not built yet;** update these answers when it is. |

## Apple: App Privacy label

Apple counts data as **collected** only if it leaves the device and is kept longer than needed to answer the request in real time. On that test:

- **Photos:** *not collected.* Processed in real time and discarded. **Keep it that way:** any server-side storage, logging or retry queue for images changes this answer.
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

  These were collected from every `PrivacyInfo.xcprivacy` under `node_modules`. Last re-run 16 Oct 2026, after adding `expo-file-system`, `expo-sharing` and `expo-clipboard`: no change. `expo-file-system` declares only file timestamps and disk space, which were already listed; `expo-sharing` and `expo-clipboard` ship no manifest. **Re-run that collection after adding any native library.** The script is in "Phase 2 results" in `docs/senbud-mobile-audit.md`. Apple emails about anything missing after a TestFlight upload.

## Google Play: Data safety

Google counts anything sent off the device, so the photo must be declared even though it isn't kept.

| Section | Answer |
|---|---|
| Does the app collect or share any required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes.** HTTPS only; release builds must use an `https://` `EXPO_PUBLIC_API_URL`. |
| Can users ask for their data to be deleted? | **Yes.** "Erase all data" in the app. Nothing is kept server-side apart from rate-limit counters that expire within 24 hours. |
| **Photos and videos → Photos** | Collected: **yes.** Shared: **no** (OpenRouter and the model provider process it for Senbud as service providers, which Google doesn't count as sharing). **Processed ephemerally: yes.** Required or optional: **optional** (only if the person uses receipt reading). Purpose: **App functionality.** |
| **Device or other IDs** | Collected: **yes.** Shared: **no.** Processed ephemerally: **no** (kept up to 24 hours). Required: **optional** (only sent with receipts). Purpose: **App functionality, Fraud prevention, security and compliance.** |
| **Financial info → Purchase history** (once RevenueCat ships) | Collected: **yes**, via Play Billing and RevenueCat. Purpose: App functionality. Re-check against RevenueCat's Data safety guide. |
| Financial info → anything else | **No.** Expenses never leave the phone. |
| Location, contacts, messages, app activity, web browsing, audio, health, calendar, files | **No** |

## Things that would change these answers

- Logging request bodies, storing receipts for "history", or a retry queue that persists images.
- Analytics or crash reporting SDKs (none yet; see the audit's open gap on mobile analytics).
- Cloud backup or sync.
- RevenueCat, when Phase 2 C lands.
- Switching models or providers. Update the consent screen's provider name in `mobile/src/app/receipt.tsx` and keep `provider.zdr`.
