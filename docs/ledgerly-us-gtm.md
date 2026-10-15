# Ledgerly: how to sell it in the US

Go-to-market research. Compiled 16 October 2026. Every source was accessed on that date. Claims tagged UNVERIFIED come from search summaries, from third parties, or are contradicted by other sources. Check them before relying on them. This report is not legal or tax advice.

---

## Verdict

It is possible to sell Ledgerly in the US, but not as it stands today, and not at first with a paid plan.

- **Competition.** The apps Ledgerly competes with are the free manual-entry tiers: EveryDollar Free, Goodbudget Free, Spendee Basic, and self-hosted Actual Budget. The $100/yr bank-sync apps are a different market.
- **No proof yet.** No solo-built, privacy-first budgeting app was found with published revenue. The closest one, Plika, had 7,500 visitors in its first month and $0 revenue.
- **The one success.** The only solo budgeting founder with public numbers is Lunch Money. It grew through a Show HN launch, Twitter and a blog to 1,000 paying users and $80k ARR about 20 months after launch (Jen Yip's Indie Hackers AMA, March 2021, confirmed on the page: https://www.indiehackers.com/post/i-bootstrapped-a-budgeting-app-to-80k-arr-as-a-company-of-one-and-digital-nomad-ama-1096ac5400).

**Recommended path.**
1. Launch free.
2. Get people to use it and come back.
3. Build one paid feature people clearly want.
4. Charge through a merchant of record that accepts Malaysian sellers.

The 90-day plan is below.

---

## 1. Who buys it

| Segment | Why they'd pick Ledgerly | Where they are |
|---|---|---|
| Privacy-conscious budgeters who won't link their bank | No account, no Plaid, data stays on the device | Hacker News, r/privacy, r/selfhosted, privacy newsletters |
| Ex-Mint users who now use spreadsheets | Charts and budgets without the setup | r/personalfinance, r/budget, "Mint alternative" searches |
| People who tried Actual Budget and gave up on self-hosting | Same local-first idea with zero setup | r/actualbudget, GitHub, HN |

**How strong is the demand?** It is real but weakly documented.

- A 2021 PYMNTS/MX survey (2,368 consumers) found that 58% of people who already connect financial apps are "uncomfortable" doing it. Fear of theft and dislike of sharing credentials were the top reasons. https://pymnts.com/?p=1194271
- No figure exists for how many people refuse to link a bank at all.
- On Hacker News, concerns about trusting Plaid come up repeatedly. People there say they use CSV files or manual entry instead. https://news.ycombinator.com/item?id=42602900
- In a May 2025 PYMNTS survey (2,040 US consumers), only 21% had created or revised a budget in the past year. Only 14% would opt in to daily budget reminders. https://www.pymnts.com/mobile/2025/daily-budget-app-adoption-stalls-at-14-percent/

Budgeting is a habit most people don't keep. Expect people to drop off quickly.

---

## 2. Competitors and prices (checked October 2026)

| App | US price | Free tier | Bank sync | Platforms | Source |
|---|---|---|---|---|---|
| YNAB | $14.99/mo · $109/yr | No (34-day trial) | Yes | Web, iOS, Android | ynab.com/pricing |
| Monarch | $14.99/mo · $99.99/yr | No | Yes | Web, iOS, Android | monarch.com/pricing |
| Copilot | $95/yr ($7.92/mo) | No (1-month trial) | Yes | Web, iPhone, Mac; no Android | copilot.money |
| Lunch Money | $10/mo · $100/yr (UNVERIFIED) | No (30-day trial) | UNVERIFIED | UNVERIFIED | lunchmoney.app/pricing |
| Tiller | $99/yr | No | Yes, into spreadsheets | Google Sheets, Excel | tiller.com/pricing |
| EveryDollar | $17.99/mo · $79.99/yr | **Yes, manual entry** | Premium only | Web, mobile | ramseysolutions.com |
| Goodbudget | $10/mo · $80/yr | **Yes** (limits UNVERIFIED) | UNVERIFIED | Web, iOS, Android | goodbudget.com |
| Spendee | $5.99/mo · $35.99/yr | **Yes** (1 wallet, 1 budget) | Yes | Mobile; web has no budgets yet | spendee.com/pricing |
| Rocket Money | Free (mobile only); Premium pay-what-you-want, about $7–14/mo | Yes | Yes | Mobile; web is paid only | rocketmoney.com |
| Simplifi | $6.99/mo billed annually ($3.99 is a promo) | No | Yes | Web, iOS, Android | quicken.com/products/simplifi |
| Actual Budget | Free (open source); hosted about $1.50/mo | Yes | Optional | Web, self-hosted | actualbudget.org |

**What this means for Ledgerly's prices.**

- **$59/yr.** It's cheaper than every app with bank sync, which charge about $80–110. Without bank sync, though, the real comparison is $0 (EveryDollar Free, Spendee Basic, Actual Budget). A paid tier has to offer something none of those free tiers do.
- **$7/mo.** This is reasonable. Copilot works out to $7.92/mo and Simplifi to $6.99/mo.
- **$149 lifetime.** None of the 11 apps offers a lifetime plan, so there's no price to anchor against. Test it with a small group; don't make it the headline offer.
- **Gaps you can fill:**
  - Rocket Money's free tier is mobile only.
  - Spendee has no budgets on the web.
  - Actual Budget is hard to set up.

  A web-first app that needs no setup fills all three.

---

## 3. What the build has to resolve before you can charge

The landing page promises **"No account, ever"** and a **14-day trial**. You can't deliver both with the current design, because checkouts, licence keys, refunds and trials all need a small server. Here's the smallest setup that keeps the free tier fully local:

1. **Hosted checkout.** Payments happen on the merchant of record's page; Ledgerly itself never handles card details.
2. **Webhook.** A serverless function (for example Cloudflare Workers or Vercel) receives the purchase event and stores the email, plan, expiry and a hash of the licence key.
3. **Licence key** emailed to the buyer.
4. **App check.** The app validates the key online when it starts. It caches a signed result for 7–14 days so it keeps working offline.
5. **Rule.** When a licence expires, only Pro features lock. Local data stays readable and exportable.

This is how Obsidian splits it: the core app is free and local, and Sync is a paid service ($4/user/mo, billed annually). https://obsidian.md/pricing.html

Update the copy to match. "No account for the free app" is accurate. "No account, ever" isn't once Pro exists.

**Other things to fix before charging:**

- **Data loss.** Everything is in browser storage, so clearing browser data wipes it. Add a prominent export/backup prompt. Also check whether iOS Safari clears storage for installed web apps (UNVERIFIED).
- **A Pro feature worth paying for.** Candidates from the competitor gaps:
  - saved CSV mappings for major US banks (Chase, Bank of America, Amex, Capital One)
  - recurring subscription detection
  - encrypted sync between devices, which is what Obsidian charges for

---

## 4. Getting users: channels ranked by cost and evidence

| # | Channel | Cost | Evidence | Fit |
|---|---|---|---|---|
| 1 | **Show HN** | $0 | Lunch Money's Show HN stayed on the front page all day and brought "well over 1,000 signups" (Indie Hackers AMA, UNVERIFIED search summary). HN rules require something people can try without signing up. https://news.ycombinator.com/showhn.html | **Best fit.** No account plus local-first is what HN likes. Launch once the app is polished. |
| 2 | **Reddit**, by helping first and promoting later | $0, plus time | According to Sacra, Reddit was where Mint users went looking for alternatives, and a main channel for Monarch. https://sacra.com/c/monarch-money/ Typical guidance is about 9 helpful posts per promotional one. Each subreddit's own rules weren't checked (UNVERIFIED). | Good. Answer "Mint alternative" and "budget without linking bank" threads honestly. |
| 3 | **SEO comparison pages** ("YNAB alternative without bank linking", "Actual Budget without self-hosting") | $0, slow | Sacra lists SEO and content as a main Monarch channel. No data was found on how well this converts for small sites. | Good over the long term. Write 5–10 honest comparison pages. |
| 4 | **Twitter/X and a public dev log** | $0 | Lunch Money reached $40k ARR through Twitter, her blog and an API, with no paid ads. https://fintechstories.substack.com/p/fintech-stories-2-jen-yip-lunch-money | Good if you post consistently. |
| 5 | **Directories**: AlternativeTo, privacy tool lists | $0 | No numbers found. | Quick wins worth doing once. |
| 6 | **Product Hunt** | $0 | The median launch in one July 2026 week got 3 upvotes, and the top 10% took 67% of all votes (Indie Hackers analysis, UNVERIFIED). | Low odds. Treat it as secondary. |
| 7 | **Affiliates / creators** | Revenue share | YNAB pays $6–10 per trial signup. https://www.ynab.com/partners/affiliate-program | Later, once you have revenue to share. |

**Don't expect another Mint moment.** When Mint shut down (announced November 2023), Monarch's new users doubled and Copilot had its "biggest day ever". https://techcrunch.com/2023/11/02/personal-finance-monarch-intuit-mint That was a one-off event, and funded teams captured it.

**The hard part is converting visitors.** Plika, a local-first finance web app, got 7,500 visitors in its first month and $0 revenue. Its founder said converting interest is the hard part (Indie Hackers, search summary).

---

## 5. Selling from Malaysia into the US

**Payments.** Use a merchant of record (MoR). The MoR is the legal seller, so it handles US sales tax and you don't need to register in any US state.

| Provider | Fee | Accepts a Malaysia-based seller? | Licence keys | Notes |
|---|---|---|---|---|
| **Polar** | 4% + 40¢ (more on international cards and subscriptions) | **Yes, Malaysia is on its payout list** | Yes | Pays out through Stripe Connect. https://polar.sh/docs/merchant-of-record/supported-countries |
| **Paddle** | 5% + 50¢ | Malaysia isn't on its unsupported list | Not researched | Sole traders skip business checks, but your site needs public pricing, terms, refund and privacy pages. https://www.paddle.com/support/countries-supported |
| Lemon Squeezy | 5% + 50¢ | UNVERIFIED | Yes (API) | In January 2026 it pointed sellers to Stripe Managed Payments. Its future is unclear. https://www.lemonsqueezy.com/blog/2026-update |
| Stripe Managed Payments | Not checked | **No, Malaysia isn't eligible** | No | https://docs.stripe.com/payments/managed-payments/eligibility |
| Creem | 3.9% + 40¢ | UNVERIFIED | UNVERIFIED | Pays out on the 1st and 15th, $50 minimum |
| Stripe direct | 2.9% + 30¢ (US cards) | Malaysia is listed, but whether individuals qualify is UNVERIFIED | No | You'd be the seller, so US sales tax would be your job. |

**Recommendation.**
1. Use **Polar** first, since it confirms Malaysian payouts and has licence keys built in.
2. Use **Paddle** as a backup.
3. On a $7/mo plan, the fixed 40–50¢ adds another 6–7%, so annual plans keep more of the revenue.

**Tax and registration** (have a professional confirm each of these):

- **W-8BEN.** Lemon Squeezy requires non-US individuals to file one, or 30% is withheld from US earnings (UNVERIFIED: the help page returned a 404, so this rests on a search snippet). Don't assume Polar and Paddle are the same. Ask them.
- **SSM.** Selling online in Peninsular Malaysia generally requires registering a business with SSM through ezBiz. Confirm with SSM directly; the source found was a commercial guide.
- **LHDN.** It's unclear whether US subscription income counts as foreign-sourced income (exempt until 31 December 2026, with conditions) or as Malaysian business income. **Ask a Malaysian tax adviser before your first sale.** https://www.hasil.gov.my
- **Stripe Atlas** (a Delaware company, about $500) is **not needed** if you sell through an MoR.

**US legal basics** (have a lawyer review):

- **CCPA** applies only above $25M revenue, 100,000+ California residents' data, or 50%+ of revenue from selling data. A small app is under all three. https://oag.ca.gov/privacy/ccpa
- **Still publish** a privacy policy, terms, a refund policy and a "not financial advice" disclaimer. The MoR checkout collects email and payment data, and Paddle requires these pages anyway.
- **FTC "click to cancel".** The federal rule was struck down on 8 July 2025. https://www.khlaw.com/insights/eighth-circuit-court-appeals-strikes-down-ftcs-click-cancel-rule The FTC still enforces ROSCA, though. Make cancelling a self-service, one-click action anyway.
- **Not researched:** California's Automatic Renewal Law and GLBA. GLBA probably doesn't apply to an app with no bank data, but have a lawyer confirm.

---

## 6. Mobile

Many US budgeting app users are on mobile, and Ledgerly is web only today.

- **PWA (installable web app).** No store fees and no app review. This is the right choice to start. Test whether iOS keeps the stored data.
- **App Store.** Apple's Small Business Program takes 15%, dropping to 10% on subscriptions after the first year. https://developer.apple.com/app-store/small-business-program/
  - Apps in the US can now link out to an external payment page. Apple's Supreme Court appeal could bring a commission on those payments back, so it isn't settled.
  - A plain web wrapper risks rejection under guideline 4.2 (UNVERIFIED).
- **Google Play.** Fees reportedly dropped to about 10% on subscriptions from 30 June 2026 (UNVERIFIED).

Go native only after the web version shows people keep using it.

---

## 7. 90-day plan

**Weeks 1–4: make it trustworthy.** Free only.
- Fix the landing page:
  - Remove the fake "Most popular" and "First 500" claims.
  - Make the hero appear instantly instead of fading in.
  - Put the backup message up front.
- Add a backup/export prompt and an installable web app (PWA).
- Add US bank CSV presets for Chase, Bank of America, Amex and Capital One.
- Deploy it on a real domain (Cloudflare Pages or Netlify, free).
- Add privacy-respecting analytics that track page visits only, never financial data. Plausible or a self-hosted counter would do.

**Weeks 5–8: launch for free.**
- Post a Show HN ("Show HN: A budgeting app that never sees your bank login").
- Answer relevant Reddit threads honestly.
- Publish 3–5 comparison pages.
- List it on AlternativeTo.
- Collect emails with a "Pro waitlist" form that asks which paid feature they'd want.

**Weeks 9–12: decide whether to charge.**
- If about 100 or more people come back each week and 50 or more join the waitlist (these thresholds are my suggestion, not industry benchmarks, so adjust them):
  - Sign up with Polar and file the paperwork.
  - Set up SSM and get tax advice.
  - Build the webhook and licence-key flow from section 3.
  - Ship one Pro feature.
  - Offer founding members $39/yr (my suggested price, not from the research).
- If not, keep it free as a portfolio project. You'll still have a launched product, real users and a story about how you launched it.

**Numbers to track:**
- visitors who add at least one transaction
- people still using it after 7 and 30 days
- waitlist sign-ups
- later: trial-to-paid conversion, refunds, and how many choose annual plans

---

## 8. Risks

- **Retention.** Manual-entry budgeting is a habit most people drop. No data was found comparing manual-entry and bank-synced apps.
- **Data loss.** Browser storage can be wiped, and one lost dataset means a bad review.
- **Free competitors.** EveryDollar Free, Spendee Basic and Actual Budget set the price at $0.
- **Trust.** You're a solo developer outside the US selling a finance app. Open-sourcing the code, or at least publishing the network-request audit, helps prove the privacy claim.
- **Platform rules.** Apple's commission on external links could come back, and the payment providers (Lemon Squeezy, Stripe) are changing their offerings.
- **Taxes.** Malaysia's foreign-income exemption ends on 31 December 2026 unless extended.

---

## Sources

- Pricing: ynab.com/pricing · monarch.com/pricing · copilot.money · lunchmoney.app/pricing · tiller.com/pricing · ramseysolutions.com/money/everydollar · goodbudget.com · spendee.com/pricing · rocketmoney.com · quicken.com/products/simplifi · actualbudget.org/docs/install/pikapods
- Demand: pymnts.com/?p=1194271 · pymnts.com/mobile/2025/daily-budget-app-adoption-stalls-at-14-percent · news.ycombinator.com/item?id=42602900
- Case studies: indiehackers.com (Lunch Money AMA, Plika, Kualia) · fintechstories.substack.com/p/fintech-stories-2-jen-yip-lunch-money · lunchmoney.app/about · dev.to/changelog/actually-opening-up · opencollective.com/actual · techcrunch.com/2023/11/02/personal-finance-monarch-intuit-mint · sacra.com/c/monarch-money
- Channels: news.ycombinator.com/showhn.html · ynab.com/partners/affiliate-program
- Payments and legal: polar.sh/docs · paddle.com/pricing · paddle.com/support/countries-supported · lemonsqueezy.com/blog/2026-update · docs.lemonsqueezy.com/api/license-api · docs.stripe.com/payments/managed-payments/eligibility · oag.ca.gov/privacy/ccpa · khlaw.com (click-to-cancel) · hasil.gov.my · developer.apple.com/app-store/small-business-program · obsidian.md/pricing.html
