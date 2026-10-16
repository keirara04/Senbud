"use client";

import { useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

// Email-only waitlist form, used in the hero and the closing call.
export function WaitlistForm({ place, center = false }: { place: "hero" | "end"; center?: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // A friend's share link (?ref=CODE) is remembered for this visit and sent with the signup.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(location.search).get("ref");
      if (fromUrl && /^[\w-]{4,32}$/.test(fromUrl)) sessionStorage.setItem("senbud:ref", fromUrl);
    } catch {
      // Storage can be blocked; referrals are a bonus, so carry on without one.
    }
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return; // stays enabled (readable) but ignores double submits
    const email = String(new FormData(e.currentTarget).get("email"));
    if (!API) {
      setStatus("error");
      setMessage("The waitlist isn’t open yet, so your email wasn’t saved. Please check back soon.");
      console.warn("Waitlist disabled: set NEXT_PUBLIC_API_URL to the Senbud API base URL.");
      return;
    }
    setStatus("sending");
    let ref = "";
    try {
      ref = sessionStorage.getItem("senbud:ref") ?? "";
    } catch {}
    try {
      const body = { email, ...(ref && { ref }) };
      const res = await fetch(`${API}/v1/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
      setMessage("Almost there. Check your inbox and tap the link to confirm your spot.");
    } catch {
      setStatus("error");
      setMessage("Your email wasn’t saved because the server didn’t respond. Try again in a minute.");
    }
  }

  return (
    <>
      {status !== "done" && (
        <form className={`join${center ? " center" : ""}`} onSubmit={submit}>
          <label htmlFor={`email-${place}`} className="sr-only">
            Email
          </label>
          <input id={`email-${place}`} name="email" type="email" required autoComplete="email" placeholder="you@school.edu" />
          <button
            type="submit"
            aria-busy={status === "sending"}
            className={`pill hl plausible-event-name=Waitlist+submit plausible-event-place=${place}`}
          >
            {status === "sending" ? "Printing your spot…" : "Join the waitlist"}
          </button>
        </form>
      )}
      <p aria-live="polite" className={`join-msg ${status}`}>
        {message}
      </p>
    </>
  );
}

// Bud's slip counts up to today's number while it prints (from 0.9 s to 1.8 s after load, in step
// with the CSS print animation). Skipped if the page took too long to hydrate or motion is reduced.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || performance.now() > 900) return;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - 900) / 900));
      el.textContent = `$${(value * (1 - (1 - k) ** 3)).toFixed(2)}`;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = `$${value.toFixed(2)}`;
    };
  }, [reduce, value]);
  return (
    <b ref={ref} className="mk">
      ${value.toFixed(2)}
    </b>
  );
}

// Matches the in-app paywall: Yearly ($39, shown as $3.25 a month) is picked first, Monthly is $4.99.
export function ProPrice() {
  const [yearly, setYearly] = useState(true);
  return (
    <>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <span className="lab">Senbud Pro</span>
        <span className="seg-mini" role="group" aria-label="Billing">
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>
            Yearly
          </button>
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>
            Monthly
          </button>
        </span>
      </div>
      <h3 className="pro-title">Senbud Pro does the typing for you</h3>
      <div className="row start" style={{ gap: 12, alignItems: "flex-end" }}>
        <div className="price">
          <span className="money">{yearly ? "$3.25" : "$4.99"}</span>
          <span className="per"> / month</span>
        </div>
        {yearly && <span className="save">Save $20.88 a year</span>}
      </div>
      <span className="cap" aria-live="polite">
        {yearly ? "Billed $39 once a year. Or $4.99 month to month." : "Billed monthly, cancel any time. Yearly works out to $3.25 a month."}
      </span>
    </>
  );
}
