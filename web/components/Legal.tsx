import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer, h2, wrap } from "./Sections";

// TODO(owner): fill these in before launch. Every <Todo> on /privacy and /terms needs a decision too.
export const CONTACT_EMAIL = "privacy@example.com";
export const UPDATED = "16 October 2026";

// Shared shell for /privacy and /terms: plain reading column, same nav and footer as the rest of the site.
export function LegalPage({ title, intro, children }: { title: ReactNode; intro: ReactNode; children: ReactNode }) {
  return (
    <>
      <Nav />
      <main id="top" tabIndex={-1} className={`${wrap} py-16 focus:outline-none sm:py-24`}>
        <h1 className={h2}>{title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-dim">{intro}</p>
        <p className="mt-3 text-sm text-ink-dim">Last updated {UPDATED}</p>
        <div className="mt-12 max-w-2xl space-y-12">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-dim [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-ink [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}

// Visible placeholder for anything not decided yet, so it can't ship unnoticed.
export function Todo({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-hl px-1 text-panel">[TODO: {children}]</mark>;
}

export function Email() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  );
}
