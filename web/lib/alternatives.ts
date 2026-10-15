// Comparison pages. Facts come from docs/senbud-us-gtm.md (prices checked October 2026, official pages).
// Keep every claim checkable: no guesses, and say plainly when the other app is the better fit.

export type Alternative = {
  slug: string;
  name: string;
  title: string;
  description: string;
  price: string;
  freePlan: string;
  bank: string;
  platforms: string;
  summary: string;
  pickThemIf: string[];
  pickSenbudIf: string[];
  source: string;
};

export const SENBUD = {
  price: "Free plan; Pro $39/yr or $4.99/mo (opens soon)",
  freePlan: "Yes, free forever",
  bank: "Never asks for a bank login",
  platforms: "Web, installable on phones",
};

export const ALTERNATIVES: Alternative[] = [
  {
    slug: "ynab-alternative",
    name: "YNAB",
    title: "A YNAB alternative that doesn’t need your bank login",
    description:
      "Compare Senbud and YNAB: price, free plan, bank connections and who each one suits. Senbud is a free, student-friendly budget app that logs spending from receipts or a quick line of text.",
    price: "$14.99/mo or $109/yr",
    freePlan: "No (34-day free trial)",
    bank: "Bank import at supported banks; built around a budgeting method",
    platforms: "Web, iOS, Android",
    summary:
      "YNAB is a mature app with a distinctive zero-based budgeting method and lots of teaching around it. Senbud is lighter: no method to learn, no bank login, and a free plan.",
    pickThemIf: [
      "You want to learn and follow a full budgeting method",
      "You want your bank transactions imported automatically",
      "You’re happy paying $109 a year for a mature, proven product",
    ],
    pickSenbudIf: [
      "You don’t want to give a budgeting app your bank login",
      "You want to snap receipts or type “lunch 12” instead of categorising feeds",
      "You’re a student and want something free that answers “can I afford it?”",
    ],
    source: "https://www.ynab.com/pricing",
  },
  {
    slug: "mint-alternative",
    name: "Mint",
    title: "A Mint alternative for people who never want to link a bank again",
    description:
      "Mint shut down in March 2024. Senbud is a free, privacy-first budgeting app that logs spending from receipts or a quick line of text, without your bank login.",
    price: "Shut down",
    freePlan: "Mint was free with ads; Intuit pointed users to Credit Karma",
    bank: "Was built on linking every account",
    platforms: "No longer available",
    summary:
      "Intuit announced Mint’s shutdown in November 2023 and closed it in March 2024. If Mint taught you that free apps can disappear with your data, Senbud keeps your data on your device and lets you export it any time.",
    pickThemIf: [
      "Credit Karma, Intuit’s suggested replacement, covers what you used Mint for",
      "You want net worth and credit tracking more than day-to-day budgeting",
    ],
    pickSenbudIf: [
      "You liked Mint’s free price but not handing over bank logins",
      "You want your data on your device, exportable as a CSV",
      "You mostly want to know what you can spend today",
    ],
    source: "https://techcrunch.com/2023/11/02/personal-finance-monarch-intuit-mint",
  },
  {
    slug: "monarch-alternative",
    name: "Monarch",
    title: "A Monarch alternative without bank syncing or a $100 subscription",
    description:
      "Compare Senbud and Monarch Money: price, free plan, bank connections and who each one suits.",
    price: "$14.99/mo or $99.99/yr",
    freePlan: "No",
    bank: "Built around connecting your accounts",
    platforms: "Web, iOS, Android",
    summary:
      "Monarch is an all-in-one household finance app: accounts, investments and shared budgets in one place. Senbud does one smaller job, day-to-day spending, without linking anything.",
    pickThemIf: [
      "You want every account, investment and net worth in one dashboard",
      "You manage money with a partner and want shared views",
      "Automatic bank syncing matters more to you than privacy",
    ],
    pickSenbudIf: [
      "You only want to track spending and budgets, not your whole net worth",
      "You won’t link your bank, or you can’t justify $99.99 a year",
      "You want split-the-bill IOUs and a rent countdown built in",
    ],
    source: "https://www.monarch.com/pricing",
  },
  {
    slug: "copilot-alternative",
    name: "Copilot",
    title: "A Copilot Money alternative that works on any phone, without bank sync",
    description:
      "Compare Senbud and Copilot Money: price, platforms, bank connections and who each one suits.",
    price: "$95/yr (about $7.92/mo, billed yearly)",
    freePlan: "No (1-month trial)",
    bank: "Built around connecting your accounts",
    platforms: "iPhone, iPad, Mac and web; no Android app",
    summary:
      "Copilot is a beautifully designed, Apple-first app with automatic categorisation from your bank feed. Senbud runs in any browser, including on Android, and never needs your bank login.",
    pickThemIf: [
      "You’re all-in on Apple devices and love polished native apps",
      "You want transactions to arrive automatically from your bank",
    ],
    pickSenbudIf: [
      "You use Android, or want something that works in any browser",
      "You’d rather snap receipts than connect accounts",
      "You want a free plan",
    ],
    source: "https://www.copilot.money/",
  },
  {
    slug: "actual-budget-alternative",
    name: "Actual Budget",
    title: "An Actual Budget alternative with nothing to self-host",
    description:
      "Compare Senbud and Actual Budget: both keep your data local. Senbud needs no server setup and adds receipt snapping, rent countdowns and bill splitting.",
    price: "Free and open source; hosted options from about $1.50/mo",
    freePlan: "Yes",
    bank: "Optional bank sync through third-party providers",
    platforms: "Web, self-hosted",
    summary:
      "Actual is a respected open-source, local-first envelope budgeting app. It’s a great fit if you enjoy running your own server. Senbud is local-first too, with zero setup.",
    pickThemIf: [
      "You want open-source software you can audit and self-host",
      "You like envelope budgeting",
      "You’re comfortable setting up and maintaining a server",
    ],
    pickSenbudIf: [
      "You want local-first privacy without running anything yourself",
      "You want receipt snapping and quick-text entry",
      "You want student features: rent countdown, treat jar, split the bill",
    ],
    source: "https://actualbudget.org/docs/install/pikapods",
  },
];

export const findAlternative = (slug: string) => ALTERNATIVES.find((a) => a.slug === slug);
