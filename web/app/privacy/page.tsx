import type { Metadata } from "next";
import { Email, LegalPage, Section, Todo } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy · Senbud",
  description: "What Senbud stores, what it doesn’t, and how to get your email removed. Your spending stays on your device.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title={
        <>
          Privacy, in <span className="marker">plain words.</span>
        </>
      }
      intro="Senbud is built so we don’t need your spending data. Here is everything we do keep, and why."
    >
      <Section title="Your spending stays on your device">
        <p>
          Everything you add to Senbud (amounts, shops, budgets, receipt photos, splits) is saved on your own device. In the
          web version that means your browser’s local storage (IndexedDB). <strong>It is never stored on Senbud’s servers.</strong>
        </p>
        <p>
          Senbud doesn’t ask for your bank login and doesn’t connect to your bank. You can export everything as a CSV at any
          time.
        </p>
        <p>
          Because we don’t hold a copy, we can’t recover it for you. If you clear your browser data or lose your device,
          your Senbud data goes with it. Export a backup now and then.
        </p>
      </Section>

      <Section title="The waitlist">
        <p>If you join the waitlist, we store:</p>
        <ul>
          <li>your email address</li>
          <li>the feature you picked</li>
          <li>when you signed up, and when you confirmed your email</li>
          <li>your referral code, who referred you (if anyone), and how many people joined with your link</li>
        </ul>
        <p>
          We use this only to send you early-access emails and to decide invite order: people who brought friends go
          first, then everyone else in the order they confirmed. We don’t sell it or share it with advertisers.
        </p>
        <p>
          We send a confirmation email when you sign up. The link in it works for 7 days. We keep only a scrambled
          (hashed) copy of the link’s code, and delete it once you confirm. The email is sent through{" "}
          <Todo>email delivery provider</Todo>.
        </p>
        <p>
          Your IP address is used for a short time to stop the form being spammed. It isn’t saved with your signup.
        </p>
        <p>
          <strong>Want off the list?</strong> Email <Email /> from the address you signed up with and we’ll delete your
          entry. Anyone you referred stays on the list; they just won’t be linked to you anymore. We aim to reply within{" "}
          <Todo>response time, e.g. 30 days</Todo>.
        </p>
      </Section>

      <Section title="AI features">
        <p>
          AI features are <strong>off until you turn them on</strong>. Without them, nothing you add ever leaves your
          device.
        </p>
        <p>
          When you use them, only what that request needs is sent: the photo or line you’re adding, plus a short summary of
          this month (for example, how much is left to spend). It goes through Senbud’s server to an AI model provider
          (currently through OpenRouter) to get an answer, and comes straight back to your device.
        </p>
        <p>
          <strong>Senbud doesn’t store or log what you send.</strong> The AI provider handles it under its own privacy
          terms. <Todo>link OpenRouter’s and the chosen model provider’s data policies</Todo>
        </p>
      </Section>

      <Section title="Analytics and cookies">
        <p>
          The Senbud website uses <strong>no cookies</strong>. To see how many people visit, it may use Plausible
          Analytics, which counts page views and button clicks (like “Join the waitlist”) without cookies and without
          building a profile of you. It doesn’t collect your name or email. Senbud’s own server also counts each page
          view: the page’s address and the site you came from, with no ID attached.
        </p>
        <p>
          <strong>In the app</strong>, Senbud sends usage stats so we can see which features people use: the app opening,
          which screen you’re on, and actions like “added an expense” or “set a limit”. They carry the app’s random
          Support ID (the one in Settings), your platform and app version.{" "}
          <strong>They never include amounts, shop names or anything you type.</strong> We also count AI requests and
          their size to track what AI costs, never what was asked. Stats are kept for 90 days. Turn them off any time in
          Settings, under Usage stats.
        </p>
        <p>
          Your browser keeps two small things on your device: the referral code from a friend’s link (until you close the
          tab) and your best ending in the Budget Dungeon game. Neither is sent to us, except the referral code when you
          join the waitlist.
        </p>
      </Section>

      <Section title="When Pro launches">
        <p>Some parts of Senbud aren’t built yet. When they are, this page will be updated first. As planned:</p>
        <ul>
          <li>
            <strong>Payments</strong> will be handled by a payment provider (Polar on the web
            <Todo>confirm; app stores may use their own billing</Todo>). They hold your payment details, not us. We keep
            only a scrambled copy of your licence key.
          </li>
          <li>
            <strong>Reminders (push notifications)</strong> would need us to store a push address for your device, plus the
            reminder text and time your device has already worked out. Never your spending.
          </li>
          <li>
            <strong>Sync between devices</strong> is planned as encrypted sync. If we build it, this page will explain
            exactly what is stored and who can read it before it’s switched on.
          </li>
        </ul>
      </Section>

      <Section title="Who we are, and your rights">
        <p>
          Senbud is run by <Todo>legal name and address</Todo>. Our servers are in <Todo>hosting region</Todo>.
        </p>
        <p>
          You can ask to see, correct or delete what we hold about you (which is only the waitlist entry above). Email{" "}
          <Email />.
        </p>
        <p>
          If this page changes in a way that matters, we’ll say so on this page and, if you’re on the waitlist, by email.
        </p>
      </Section>
    </LegalPage>
  );
}
