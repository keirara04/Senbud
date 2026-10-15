"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Check, ChevronDown } from "lucide-react";
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
            <h2 className={h2}>Free covers the basics. Pro does the typing.</h2>
            <p className="mt-4 max-w-lg text-lg text-ink-dim">Free stays free, and exporting your data is never behind a paywall.</p>
          </div>
          <div role="radiogroup" aria-label="Billing period" className="flex shrink-0 rounded-full bg-paper-2 p-1 ring-1 ring-line">
            {[
              { v: false, label: "Monthly" },
              { v: true, label: "Yearly, save 35%" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={yearly === o.v}
                onClick={() => setYearly(o.v)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${yearly === o.v ? "bg-plum text-on-plum" : "text-ink-dim hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl bg-paper-2 p-7 ring-1 ring-line sm:p-9">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="mt-4 font-display text-6xl">$0</p>
            <p className="mt-1 text-ink-dim">forever, no card needed</p>
            <ul className="mt-8 flex-1 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-lilac-deep" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#waitlist" className="mt-9 rounded-full py-3.5 text-center font-semibold ring-1 ring-line transition-colors hover:bg-paper">
              Get early access
            </a>
          </div>

          <div className="flex flex-col rounded-3xl bg-plum p-7 text-on-plum ring-2 ring-lilac/60 sm:p-9">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Pro</h3>
              <span className="rounded-full bg-mango px-3 py-1 text-xs font-semibold text-plum">Opens soon</span>
            </div>
            <p className="mt-4 font-display text-6xl tabular-nums">{yearly ? "$39" : "$4.99"}</p>
            <p className="mt-1 text-on-plum-dim">{yearly ? "per year, about $3.25 a month" : "per month, cancel any time"}</p>
            <ul className="mt-8 flex-1 space-y-3">
              {PRO.map((f) => (
                <li key={f} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-mango" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#waitlist" className="mt-9 rounded-full bg-lilac py-3.5 text-center font-semibold text-plum">
              Join the Pro waitlist
            </a>
            <p className="mt-3 text-center text-sm text-on-plum-dim">Join now and your founding price stays the same when Pro opens.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Do I need to connect my bank?", "No. You add spending by photo, by typing a line, or by tapping it in. Ledgerly never asks for a bank login."],
  [
    "Where is my data stored?",
    "In your browser, on your device. Nothing about your spending is stored on Ledgerly’s servers. You can export everything as a CSV at any time.",
  ],
  [
    "What happens if I clear my browser data?",
    "Your Ledgerly data is deleted with it, the same as any site data. Ledgerly reminds you to export a backup, and you can import that file again later.",
  ],
  [
    "What does the AI see?",
    "AI features are off until you turn them on. When you use them, only the photo or line you’re adding and a short summary of this month are sent to the AI model to get an answer. They aren’t stored by Ledgerly.",
  ],
  ["Does it work on my phone?", "Yes. Ledgerly is a web app you can add to your home screen. It works offline for everything except the AI features."],
  ["When can I use it?", "Ledgerly is in development. Join the waitlist and you’ll get an email when early access opens."],
] as const;

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-line">
      <div className={`${wrap} grid gap-10 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr]`}>
        <h2 className={h2}>Questions people ask first.</h2>
        <Accordion.Root type="single" collapsible className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold">
                  {q}
                  <ChevronDown className="shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="pb-5 pr-8 text-ink-dim">{a}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL;

export function Waitlist() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!API) {
      setStatus("error");
      setMessage("The waitlist isn’t open yet, so your email wasn’t saved. Please check back soon.");
      console.warn("Waitlist disabled: set NEXT_PUBLIC_API_URL to the Ledgerly API base URL.");
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
    } catch {
      setStatus("error");
      setMessage("Your email wasn’t saved because the server didn’t respond. Try again in a minute.");
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-16 bg-plum text-on-plum">
      <div className={`${wrap} grid gap-10 py-20 sm:py-28 lg:grid-cols-2 lg:items-center`}>
        <div>
          <h2 className={h2}>Get early access.</h2>
          <p className="mt-5 max-w-md text-lg text-on-plum-dim">
            Ledgerly is being built now. Join the list and tell us which feature you want first. It decides what we
            ship next.
          </p>
        </div>
        <form onSubmit={submit} className="rounded-3xl bg-plum-2 p-6 sm:p-8">
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
            className="mt-2 w-full rounded-xl bg-plum px-4 py-3 text-on-plum ring-1 ring-plum-line placeholder:text-on-plum-dim/60 focus:outline-none focus:ring-2 focus:ring-lilac"
          />
          <label htmlFor="feature" className="mt-5 block text-sm font-medium">
            Which feature do you want most?
          </label>
          <select
            id="feature"
            name="feature"
            defaultValue="receipt"
            className="mt-2 w-full rounded-xl bg-plum px-4 py-3 text-on-plum ring-1 ring-plum-line focus:outline-none focus:ring-2 focus:ring-lilac"
          >
            <option value="receipt">Snap receipts</option>
            <option value="afford">Can I afford it?</option>
            <option value="split">Split with friends</option>
            <option value="subscriptions">Subscription reminders</option>
            <option value="wrapped">Monthly recap</option>
          </select>
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-6 w-full rounded-full bg-lilac py-3.5 font-semibold text-plum disabled:opacity-60"
          >
            {status === "sending" ? "Joining…" : "Join the waitlist"}
          </button>
          <p aria-live="polite" className={`mt-4 min-h-6 text-sm ${status === "error" ? "text-coral" : "text-mint"}`}>
            {message}
          </p>
        </form>
      </div>
    </section>
  );
}
