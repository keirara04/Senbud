import { ArrowRight, Camera, Check, Keyboard, MessageSquareText, Server, Smartphone, Sparkles } from "lucide-react";

export const wrap = "mx-auto max-w-6xl px-4 sm:px-6";
export const h2 = "font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06]";

export function Problem() {
  return (
    <section className={`${wrap} py-20 sm:py-28`}>
      <p className={`${h2} max-w-4xl`}>
        Most budget apps want your bank password or your patience. Senbud needs neither.
      </p>
      <div className="mt-10 grid max-w-4xl gap-8 text-lg leading-relaxed text-ink-dim sm:grid-cols-2">
        <p>Linking a bank account to an app you found last week feels like a lot to ask. So people don’t.</p>
        <p>Typing in every coffee and bus fare gets old by week two. So people stop.</p>
      </div>
    </section>
  );
}

function ReceiptLine({ label, cat, amount }: { label: string; cat: string; amount: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md bg-receipt px-2.5 py-1.5 font-mono text-[12px] text-receipt-ink shadow-sm ring-1 ring-black/5">
      <span>{label}</span>
      <span className="rounded bg-[#1f3fd8]/10 px-1 font-sans text-[10px] font-semibold text-[#1f3fd8]">{cat}</span>
      <span className="ml-auto tabular-nums">{amount}</span>
    </span>
  );
}

const Arrow = () => <ArrowRight size={18} className="shrink-0 text-ink-dim" aria-hidden="true" />;

// Each way to add spending is shown as input -> what lands on your receipt.
const ways = [
  {
    icon: Camera,
    title: "Snap it",
    body: "Take a photo of a receipt or a screenshot of your banking app. Senbud reads the shop, amount and date.",
    from: (
      <span className="relative h-20 w-16 shrink-0 -rotate-6 overflow-hidden rounded-md bg-receipt p-2 shadow-md ring-1 ring-black/5">
        {[80, 60, 70, 45].map((w, i) => (
          <span key={i} className="mb-1.5 block h-1 rounded bg-receipt-ink/25" style={{ width: `${w}%` }} />
        ))}
        <span className="absolute inset-x-0 top-8 h-3 bg-hl/80" />
      </span>
    ),
    to: <ReceiptLine label="Mamak" cat="Food" amount="$8.40" />,
  },
  {
    icon: MessageSquareText,
    title: "Type it like a text",
    body: "Write the way you’d tell a friend. One line can hold a whole day.",
    from: (
      <span className="shrink-0 rounded-2xl rounded-br-md bg-panel px-3 py-2 text-sm text-on-panel">lunch 12, grab 8</span>
    ),
    to: (
      <span className="grid gap-1.5">
        <ReceiptLine label="Lunch" cat="Food" amount="$12" />
        <ReceiptLine label="Grab" cat="Transport" amount="$8" />
      </span>
    ),
  },
  {
    icon: Keyboard,
    title: "Or tap it in yourself",
    body: "Amount first, then a category. Two taps, no AI involved, and it works offline.",
    from: (
      <span className="shrink-0">
        <span className="block font-display text-2xl tabular-nums">$12</span>
        <span className="mt-1 flex gap-1">
          <span className="rounded-full bg-hl px-2 py-0.5 text-[11px] font-semibold text-[#1f3fd8]">Food</span>
          <span className="rounded-full px-2 py-0.5 text-[11px] text-ink-dim ring-1 ring-line">Bills</span>
        </span>
      </span>
    ),
    to: <ReceiptLine label="Lunch" cat="Food" amount="$12" />,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-t border-line">
      <div className={`${wrap} grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className={h2}>Three ways to add spending. Pick the lazy one.</h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Every entry lands in the same place, so your budget, rent and treats stay up to date whichever way you
            use.
          </p>
        </div>
        <ul className="grid gap-4">
          {ways.map(({ icon: Icon, title, body, from, to }) => (
            <li key={title} className="rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel text-hl">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-1.5 text-ink-dim">{body}</p>
                </div>
              </div>
              <div aria-hidden="true" className="mt-5 flex items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line sm:gap-4">
                {from}
                <Arrow />
                <span className="min-w-0 flex-1">{to}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const keep = ["Every transaction, budget and receipt photo", "Your rent, treats and friends’ IOUs", "Export it all as a CSV, any time"];
const never = ["Your bank login", "Card numbers", "Ads", "Selling your data", "Paywalled exports"];

// Privacy as a map of where data actually flows, rather than three matching cards.
export function Privacy() {
  return (
    <section className="bg-panel text-on-panel">
      <div className={`${wrap} py-20 sm:py-28`}>
        <h2 className={`${h2} max-w-3xl`}>Here’s exactly where your money data goes.</h2>

        <div className="mt-12 grid items-center gap-4 lg:grid-cols-[1.15fr_auto_1fr]">
          <div className="rounded-[2rem] border-4 border-white/15 bg-panel-2 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Smartphone className="text-hl" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Your phone or laptop</h3>
            </div>
            <p className="mt-1 text-sm text-on-panel-dim">Everything lives here, in your browser.</p>
            <ul className="mt-5 space-y-3">
              {keep.map((k) => (
                <li key={k} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" />
                  {k}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 py-2 lg:flex-col lg:flex-nowrap lg:px-2">
            <span className="sr-only">Sent to the AI, only if you turn it on:</span>
            <span className="hidden h-px w-10 border-t-2 border-dashed border-white/30 lg:block lg:h-10 lg:w-px lg:border-l-2 lg:border-t-0" />
            <span className="rounded-full bg-hl px-3 py-1 text-xs font-semibold text-panel">the line you’re adding</span>
            <span className="rounded-full bg-hl px-3 py-1 text-xs font-semibold text-panel">this month’s summary</span>
            <ArrowRight size={20} className="rotate-90 text-hl lg:rotate-0" aria-hidden="true" />
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl bg-panel-2 p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-hl" aria-hidden="true" />
                <h3 className="text-lg font-semibold">AI model</h3>
              </div>
              <p className="mt-2 text-on-panel-dim">
                Reads that one request, sends an answer back, and keeps nothing. Only used if you turn AI on.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-dashed border-white/25 p-6">
              <div className="flex items-center gap-3">
                <Server className="text-on-panel-dim" aria-hidden="true" />
                <h3 className="text-lg font-semibold">Senbud’s servers</h3>
              </div>
              <p className="mt-2 text-on-panel-dim">Store none of your transactions, receipts or budgets.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <p className="max-w-xl text-on-panel-dim">
            Because your data lives in your browser, clearing your browser data deletes it. Senbud reminds you to
            export a backup, and the file is yours to keep.
          </p>
          <div className="receipt w-full max-w-xs justify-self-center px-6 pb-7 pt-6 font-mono text-[13px] sm:rotate-2 lg:justify-self-end">
            <p className="uppercase tracking-wider text-receipt-ink/75">Never on the bill</p>
            <div className="my-3 border-t border-dashed border-receipt-ink/25" />
            <ul className="space-y-1.5">
              {never.map((n) => (
                <li key={n} className="flex justify-between gap-4">
                  <span className="line-through decoration-coral decoration-2">{n}</span>
                  <span className="text-receipt-ink/75">$0</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${wrap} flex flex-col gap-4 py-10 text-sm text-ink-dim sm:flex-row sm:items-center sm:justify-between`}>
        <p>© 2026 Senbud. Senbud is a budgeting tool, not financial advice.</p>
        <nav aria-label="Footer" className="flex gap-5 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
      </div>
    </footer>
  );
}
