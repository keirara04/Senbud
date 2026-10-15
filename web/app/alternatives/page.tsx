import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer, h2, wrap } from "@/components/Sections";
import { ALTERNATIVES } from "@/lib/alternatives";

export const metadata: Metadata = {
  title: "Budget app alternatives without a bank login · Senbud",
  description: "How Senbud compares with YNAB, Mint, Monarch, Copilot and Actual Budget, including when the other app is the better pick.",
  alternates: { canonical: "/alternatives" },
};

export default function AlternativesIndex() {
  return (
    <>
      <Nav />
      <main id="top" tabIndex={-1} className={`${wrap} py-16 focus:outline-none sm:py-24`}>
        <h1 className={h2}>
          Senbud compared, <span className="marker">honestly.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-dim">
          Each page says when the other app is the better choice. Prices were checked in October 2026.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {ALTERNATIVES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/alternatives/${a.slug}`}
                className="block h-full rounded-3xl bg-paper-2 p-6 ring-1 ring-line transition-transform hover:-translate-y-0.5"
              >
                <p className="text-sm text-ink-dim">Senbud vs {a.name}</p>
                <p className="mt-2 text-xl font-semibold">{a.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
