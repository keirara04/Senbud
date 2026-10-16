import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { BudgetCalculator } from "@/components/BudgetCalculator";
import { Nav } from "@/components/Nav";
import { Footer, h2, wrap } from "@/components/Sections";

const TITLE = "Student budget calculator: how much can I spend a week?";
const DESCRIPTION =
  "Free student budget calculator. Enter what you have, your bills and the days until payday or your allowance, and see how much you can spend each week and each day.";

export const metadata: Metadata = {
  title: `${TITLE} · Senbud`,
  description: DESCRIPTION,
  alternates: { canonical: "/student-budget-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  ["Start with what you have", "Everything you can actually spend today: your bank balance, cash, and any card balance."],
  ["Take out what you can't skip", "Rent, phone, a transport pass, a subscription that renews before payday. Then whatever you want to save."],
  ["Spread the rest", "What's left, divided by the days until money comes in. Times seven gives you a weekly number to aim for."],
] as const;

const FAQ = [
  [
    "How much should a student spend a week?",
    "There's no single right number. It depends on your rent, your city and how much money comes in. The honest answer is whatever is left after bills and savings, spread over the days until your next payday or allowance. That's what this calculator works out.",
  ],
  [
    "What if I get paid at different times?",
    "Use the next date money is certain to arrive. If a shift or a transfer might come earlier, treat that as a bonus rather than counting on it.",
  ],
  [
    "Should I count my student loan or allowance?",
    "Count it once it's in your account. If it lands at the start of term and has to last until the next one, enter the days until then, not until the end of the month.",
  ],
  [
    "What happens if I overspend one day?",
    "The next days get a little less. Run the numbers again with your new balance and the calculator spreads what's left over the days you have.",
  ],
  [
    "Is anything I type here saved?",
    "No. The maths runs in your browser and nothing is sent anywhere.",
  ],
] as const;

export default function StudentBudgetCalculator() {
  return (
    <>
      <Nav />
      <main>
        <section id="top" tabIndex={-1} className="relative overflow-hidden focus:outline-none">
          <div className={`${wrap} py-14 sm:py-20`}>
            <p className="text-sm font-medium text-ink-dim">Free student budget calculator</p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[1.04]">
              How much can I spend a week <span className="marker">until payday?</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              Enter what you have, what you owe before money comes in, and how many days that is. You get a weekly and a
              daily number with your bills already covered.
            </p>
            <div className="mt-10">
              <BudgetCalculator />
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className={`${wrap} py-16 sm:py-24`}>
            <h2 className={h2}>How the number is worked out.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="rounded-3xl bg-paper-2 p-6 ring-1 ring-line sm:p-7">
                  <p className="font-mono text-sm text-ink-dim">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-ink-dim">{body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-2xl rounded-2xl bg-paper-2 p-5 font-mono text-sm ring-1 ring-line">
              per week = (money now − bills − savings) ÷ days until payday × 7
            </p>
          </div>
        </section>

        <section className="bg-panel text-on-panel">
          <div className={`${wrap} grid gap-8 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center`}>
            <div>
              <h2 className={h2}>Senbud keeps this number up to date for you.</h2>
              <p className="mt-5 max-w-xl text-lg text-on-panel-dim">
                Snap a receipt or type &ldquo;lunch 12&rdquo; and your safe-to-spend for today updates. It knows when
                rent is due and tells you when that treat fits. No bank login, and your data stays on your phone.
              </p>
            </div>
            <div>
              <Link
                href="/#waitlist"
                className="plausible-event-name=CTA plausible-event-place=calculator hl-sweep inline-flex min-h-11 items-center rounded-full bg-hl px-6 font-semibold text-panel"
              >
                Get early access, free
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className={`${wrap} grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]`}>
            <h2 className={h2}>Student budget questions.</h2>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} name="calculator-faq" className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="pb-5 pr-8 text-ink-dim">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
