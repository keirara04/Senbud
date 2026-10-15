"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { h2, wrap } from "./Sections";

const FREE = [
  "Type or tap in your spending",
  "One weekly or monthly budget, with reminders",
  "Safe to spend today, rent countdown, Can I afford it?",
  "Treat jar and hours of work",
  "Split bills by hand and track IOUs",
  "Monthly recap",
  "AI assistant, 10 messages a day",
  "Export everything, any time",
];

const PRO = [
  "Everything in Free",
  "Snap receipts and screenshots",
  "Unlimited AI assistant (fair use)",
  "Several budgets, category limits and until-payday budgets",
  "Split a receipt item by item",
  "Subscription spotting and renewal reminders",
  "Treat nudges when a treat fits",
  "Full recap, yearly edition and share cards",
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-line">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={h2}>Free covers the basics. <span className="marker">Pro does the typing.</span></h2>
            <p className="mt-4 max-w-lg text-lg text-ink-dim">Free stays free, and exporting your data is never behind a paywall.</p>
          </div>
          <fieldset className="flex shrink-0 rounded-full bg-paper-2 p-1 ring-1 ring-line">
            <legend className="sr-only">Billing period</legend>
            {[
              { v: false, label: "Monthly" },
              { v: true, label: "Yearly, save 35%" },
            ].map((o) => (
              <label
                key={o.label}
                className={`flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hl ${yearly === o.v ? "bg-panel text-on-panel" : "text-ink-dim hover:text-ink"}`}
              >
                <input
                  type="radio"
                  name="billing"
                  className="sr-only"
                  checked={yearly === o.v}
                  onChange={() => setYearly(o.v)}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl bg-paper-2 p-7 ring-1 ring-line sm:p-9">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="mt-4 font-display text-6xl">$0</p>
            <p className="mt-1 text-ink-dim">forever, no card needed</p>
            <ul className="mt-8 flex-1 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#waitlist" className="mt-9 rounded-full py-3.5 text-center font-semibold ring-1 ring-line transition-colors hover:bg-paper">
              Get early access
            </a>
          </div>

          <div className="flex flex-col rounded-3xl bg-panel p-7 text-on-panel ring-2 ring-hl/60 sm:p-9">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Pro</h3>
              <span className="rounded-full bg-hl px-3 py-1 text-xs font-semibold text-panel">Opens soon</span>
            </div>
            <p className="mt-4 font-display text-6xl tabular-nums">{yearly ? "$39" : "$4.99"}</p>
            <p className="mt-1 text-on-panel-dim">{yearly ? "per year, about $3.25 a month" : "per month, cancel any time"}</p>
            <ul className="mt-8 flex-1 space-y-3">
              {PRO.map((f) => (
                <li key={f} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#waitlist" className="mt-9 rounded-full bg-hl py-3.5 text-center font-semibold text-panel">
              Join the Pro waitlist
            </a>
            <p className="mt-3 text-center text-sm text-on-panel-dim">Join now and your founding price stays the same when Pro opens.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Do I need to connect my bank?", "No. You add spending by photo, by typing a line, or by tapping it in. Senbud never asks for a bank login."],
  [
    "Where is my data stored?",
    "In your browser, on your device. Nothing about your spending is stored on Senbud’s servers. You can export everything as a CSV at any time.",
  ],
  [
    "What happens if I clear my browser data?",
    "Your Senbud data is deleted with it, the same as any site data. Senbud reminds you to export a backup, and you can import that file again later.",
  ],
  [
    "What does the AI see?",
    "AI features are off until you turn them on. When you use them, only the photo or line you’re adding and a short summary of this month are sent to the AI model to get an answer. They aren’t stored by Senbud.",
  ],
  ["Does it work on my phone?", "Yes. Senbud is a web app you can add to your home screen. It works offline for everything except the AI features."],
  ["When can I use it?", "Senbud is in development. Join the waitlist and you’ll get an email when early access opens."],
] as const;

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-line">
      <div className={`${wrap} grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr]`}>
        <h2 className={h2}>Questions people <span className="marker">ask first.</span></h2>
        {/* Native details: answers ship in the static HTML, and name="faq" keeps one open at a time. */}
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} name="faq" className="group">
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
  );
}

const API = process.env.NEXT_PUBLIC_API_URL;

export function Waitlist() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [joined, setJoined] = useState<{ email: string; feature: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return; // stays enabled (readable) but ignores double submits
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!API) {
      setStatus("error");
      setMessage("The waitlist isn’t open yet, so your email wasn’t saved. Please check back soon.");
      console.warn("Waitlist disabled: set NEXT_PUBLIC_API_URL to the Senbud API base URL.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(`${API}/v1/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      setMessage("You’re on the list. We’ll email you when early access opens.");
      const select = form.elements.namedItem("feature") as HTMLSelectElement;
      setJoined({ email: String(data.email), feature: select.selectedOptions[0]?.text ?? "" });
    } catch {
      setStatus("error");
      setMessage("Your email wasn’t saved because the server didn’t respond. Try again in a minute.");
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-16 bg-panel text-on-panel">
      <div className={`${wrap} grid gap-10 py-20 sm:py-28 lg:grid-cols-2 lg:items-center`}>
        <div>
          <h2 className={h2}>
            Get <span className="marker marker-soft">early access.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg text-on-panel-dim">
            Senbud is being built now. Join the list and tell us which feature you want first. It decides what we
            ship next.
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {joined ? (
            <motion.div
              key="ticket"
              initial={{ opacity: 0, y: -40, rotate: -6 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="mx-auto w-full max-w-sm drop-shadow-[0_24px_30px_rgb(0_0_0/0.35)]"
            >
              <div className="receipt relative px-7 pb-9 pt-8 font-mono text-[13px]">
                <p className="uppercase tracking-wider text-receipt-ink/75">Senbud · early access</p>
                <div className="my-3 border-t border-dashed border-receipt-ink/25" />
                <p className="flex justify-between gap-4">
                  <span>Email</span>
                  <span className="truncate">{joined.email}</span>
                </p>
                <p className="mt-1 flex justify-between gap-4">
                  <span>Wants first</span>
                  <span className="truncate">{joined.feature}</span>
                </p>
                <div className="my-3 border-t border-dashed border-receipt-ink/25" />
                <p className="text-receipt-ink/75">We’ll email you when early access opens.</p>
                <motion.p
                  initial={{ opacity: 0, scale: 1.8, rotate: -24 }}
                  animate={{ opacity: 1, scale: 1, rotate: -12 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 420, damping: 16 }}
                  className="absolute right-5 top-14 rounded-lg border-[3px] border-[#1f3fd8] px-3 py-1 font-sans text-lg font-black uppercase tracking-wide text-[#1f3fd8]"
                >
                  You’re in
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0, y: 30, transition: { duration: 0.2 } }}>
          <form onSubmit={submit} className="rounded-3xl bg-panel-2 p-6 sm:p-8">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl bg-panel px-4 py-3 text-on-panel ring-1 ring-panel-line placeholder:text-on-panel-dim/60 focus:outline-none focus:ring-2 focus:ring-hl"
            />
            <label htmlFor="feature" className="mt-5 block text-sm font-medium">
              Which feature do you want most?
            </label>
            <select
              id="feature"
              name="feature"
              defaultValue="receipt"
              className="mt-2 w-full rounded-xl bg-panel px-4 py-3 text-on-panel ring-1 ring-panel-line focus:outline-none focus:ring-2 focus:ring-hl"
            >
              <option value="receipt">Snap receipts</option>
              <option value="afford">Can I afford it?</option>
              <option value="split">Split with friends</option>
              <option value="subscriptions">Subscription reminders</option>
              <option value="wrapped">Monthly recap</option>
            </select>
            <button
              type="submit"
              aria-busy={status === "sending"}
              className="hl-sweep relative mt-6 w-full overflow-hidden rounded-full bg-hl py-3.5 font-semibold text-panel"
            >
              {status === "sending" ? "Printing your spot…" : "Join the waitlist"}
              {status === "sending" && (
                <span aria-hidden="true" className="absolute inset-x-6 bottom-1.5 h-1 rounded-full bg-panel/15">
                  <span className="printing-strip block h-full rounded-full bg-[repeating-linear-gradient(90deg,var(--panel)_0_6px,transparent_6px_10px)]" />
                </span>
              )}
            </button>
            <p aria-live="polite" className={`mt-4 min-h-6 text-sm ${status === "error" ? "text-[#ffc2b8]" : "text-hl"}`}>
              {message}
            </p>
          </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
