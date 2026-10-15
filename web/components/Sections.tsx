import { ArrowRight, ArrowUp, Camera, Keyboard, MessageSquareText } from "lucide-react";
import { MobileBar } from "./MobileBar";
import { BankAsk, StreakFade } from "./Problem";

export const wrap = "mx-auto max-w-6xl px-4 sm:px-6";
export const h2 = "font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06]";

export function Problem() {
  return (
    <section className={`${wrap} py-20 sm:py-28`}>
      <h2 className={`${h2} max-w-4xl`}>
        Most budget apps want your bank password or your patience.{" "}
        <span className="marker">Senbud needs neither.</span>
      </h2>
      <div className="relative isolate mt-12 grid gap-4 md:grid-cols-2">
        <div aria-hidden="true" className="paper-glow cobalt -left-10 top-10 h-64 w-72" />
        <div aria-hidden="true" className="paper-glow hl -right-10 bottom-0 h-64 w-72" />
        <div className="flex flex-col gap-6 rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-8">
          <BankAsk />
          <div>
            <h3 className="text-lg font-semibold">The bank-login ask</h3>
            <p className="mt-1.5 text-ink-dim">
              Linking a bank account to an app you found last week feels like a lot to ask. So people don’t.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-8">
          <StreakFade />
          <div>
            <h3 className="text-lg font-semibold">The typing marathon</h3>
            <p className="mt-1.5 text-ink-dim">Typing in every coffee and bus fare gets old by week two. So people stop.</p>
          </div>
        </div>
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
    <section id="how" className="scroll-mt-16">
      <div className={`${wrap} grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className={h2}>Three ways to add spending. <span className="marker">Pick the lazy one.</span></h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Every entry lands in the same place, so your budget, rent and treats stay up to date whichever way you
            use.
          </p>
        </div>
        <ul className="relative isolate grid gap-4">
          <li aria-hidden="true" className="paper-glow hl -right-16 top-1/3 h-72 w-72 list-none" />
          <li aria-hidden="true" className="paper-glow cobalt -left-10 bottom-10 h-64 w-64 list-none" />
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

// Bar widths for the decorative barcode (fixed, so the HTML is identical on every build).
const BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1];

// The footer is the page's receipt: links as line items, a total, a barcode, and a way back up.
export function Footer() {
  return (
    <footer className="pb-24 pt-14 md:pb-14">
      <div className="mx-auto max-w-md px-4">
        <div className="drop-shadow-[0_18px_24px_rgb(0_0_0/0.18)]">
          <div className="receipt px-6 pb-9 pt-7 font-mono text-[13px] sm:px-8">
            <div className="flex justify-between uppercase tracking-wider text-receipt-ink/75">
              <span>Senbud</span>
              <span>Receipt #2026</span>
            </div>
            <div className="my-3 border-t border-dashed border-receipt-ink/25" />
            <nav aria-label="Footer">
              <ul>
                {[
                  ["How it works", "#how"],
                  ["Pricing", "#pricing"],
                  ["FAQ", "#faq"],
                  ["Get early access", "#waitlist"],
                ].map(([label, href], i) => (
                  <li key={href}>
                    <a href={href} className="group flex min-h-11 items-center gap-2 hover:text-[#1f3fd8]">
                      <span className="group-hover:underline group-hover:decoration-[#eeff5a] group-hover:decoration-4 group-hover:underline-offset-2">
                        {label}
                      </span>
                      <span className="dotted-leader" />
                      <span className="tabular-nums text-receipt-ink/75">{String(i + 1).padStart(2, "0")}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="my-3 border-t border-dashed border-receipt-ink/25" />
            <div className="flex justify-between font-semibold">
              <span>Spent on ads</span>
              <span>$0.00</span>
            </div>
            <div className="barcode mx-auto mt-6 flex h-12 w-fit items-stretch gap-[2px]" aria-hidden="true">
              {BARS.map((w, i) => (
                <span key={i} className="bg-receipt-ink" style={{ width: w * 1.5 }} />
              ))}
            </div>
            <p className="mt-4 text-center uppercase tracking-[0.2em]">Thank you. Come again.</p>
            <p className="mt-3 text-center text-[11px] text-receipt-ink/75">
              © 2026 Senbud · a budgeting tool, not financial advice
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <a href="#top" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-dim ring-1 ring-line hover:text-ink">
            <ArrowUp size={16} aria-hidden="true" />
            Back to top
          </a>
        </div>
      </div>
      <MobileBar />
    </footer>
  );
}
