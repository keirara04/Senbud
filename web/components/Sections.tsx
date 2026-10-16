import { ArrowUp } from "lucide-react";
import Link from "next/link";
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
                  ["How it works", "/#how"],
                  ["Pricing", "/#pricing"],
                  ["FAQ", "/#faq"],
                  ["Budget calculator", "/student-budget-calculator"],
                  ["Compare apps", "/alternatives"],
                  ["Get early access", "/#waitlist"],
                  ["Privacy", "/privacy"],
                  ["Terms", "/terms"],
                ].map(([label, href], i) => (
                  <li key={href}>
                    <Link href={href} className="group flex min-h-11 items-center gap-2 hover:text-[#1f3fd8]">
                      <span className="group-hover:underline group-hover:decoration-[#eeff5a] group-hover:decoration-4 group-hover:underline-offset-2">
                        {label}
                      </span>
                      <span className="dotted-leader" />
                      <span className="tabular-nums text-receipt-ink/75">{String(i + 1).padStart(2, "0")}</span>
                    </Link>
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
