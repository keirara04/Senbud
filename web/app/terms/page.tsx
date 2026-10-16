import type { Metadata } from "next";
import Link from "next/link";
import { Email, LegalPage, Section, Todo } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms · Senbud",
  description: "The short version of the rules for using Senbud while it’s in beta.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title={
        <>
          Terms, <span className="marker">kept short.</span>
        </>
      }
      intro="By using Senbud or joining the waitlist, you agree to these terms. If something here is unclear, ask us."
    >
      <Section title="Senbud is in beta">
        <p>
          Senbud is still being built. Features may change, break or disappear, and we may pause or end the beta at any
          time.
        </p>
        <p>
          Your data lives only on your device (see the <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">privacy page</Link>),
          so we can’t restore it if it’s lost. Export a CSV backup now and then.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          Senbud is a budgeting tool, not financial advice. Numbers like “safe to spend” or “can I afford it” are estimates
          from what you’ve entered. Check anything important yourself before acting on it.
        </p>
      </Section>

      <Section title="No guarantees">
        <p>
          Senbud is provided as it is, without promises that it will always work or always be right. As far as the law
          allows, we aren’t responsible for losses from using it, including lost data or money decisions made with it.{" "}
          <Todo>have this limitation of liability reviewed for your country</Todo>
        </p>
      </Section>

      <Section title="Using it fairly">
        <ul>
          <li>Don’t misuse the service, for example by flooding the waitlist or the AI features, or trying to break in.</li>
          <li>Don’t use referral links to sign up fake or other people’s email addresses.</li>
          <li>
            You must be at least <Todo>minimum age, e.g. 13 or 16, plus parental consent rule</Todo> to use Senbud.
          </li>
        </ul>
      </Section>

      <Section title="Pro billing and refunds">
        <p>Senbud Pro isn’t on sale yet. When it is, this section will cover:</p>
        <ul>
          <li>
            how you’re billed and by whom <Todo>Polar on the web; app store billing on iOS and Android?</Todo>
          </li>
          <li>
            renewals and how to cancel <Todo>cancellation terms</Todo>
          </li>
          <li>
            refunds <Todo>refund policy, e.g. full refund within 14 days</Todo>
          </li>
        </ul>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update these terms. If a change matters, we’ll say so here and, if you’re on the waitlist, by email.
        </p>
        <p>
          These terms are governed by the laws of <Todo>country</Todo>. Senbud is run by <Todo>legal name</Todo>. Questions:{" "}
          <Email />.
        </p>
      </Section>
    </LegalPage>
  );
}
