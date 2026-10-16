import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer, h2, wrap } from "@/components/Sections";
import { ALTERNATIVES, findAlternative, SENBUD } from "@/lib/alternatives";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/alternatives/[slug]">): Promise<Metadata> {
  const alt = findAlternative((await params).slug);
  if (!alt) return {};
  return {
    title: `${alt.title} · Senbud`,
    description: alt.description,
    alternates: { canonical: `/alternatives/${alt.slug}` },
    openGraph: { title: alt.title, description: alt.description },
  };
}

const ROWS = [
  ["Price", "price"],
  ["Free plan", "freePlan"],
  ["Bank connection", "bank"],
  ["Platforms", "platforms"],
] as const;

export default async function AlternativePage({ params }: PageProps<"/alternatives/[slug]">) {
  const alt = findAlternative((await params).slug);
  if (!alt) notFound();

  return (
    <>
      <Nav />
      <main>
        <section id="top" tabIndex={-1} className="relative overflow-hidden bg-panel text-on-panel focus:outline-none">
          <div aria-hidden="true" className="grid-paper pointer-events-none absolute inset-0" />
          <div className={`relative ${wrap} py-16 sm:py-24`}>
            <p className="text-sm text-on-panel-dim">
              <Link href="/alternatives" className="underline-offset-4 hover:underline">
                Alternatives
              </Link>{" "}
              / {alt.name}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] leading-[1.04]">{alt.title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-on-panel-dim">{alt.summary}</p>
            <Link
              href="/#waitlist"
              className="hl-sweep mt-8 inline-flex min-h-11 items-center rounded-full bg-hl px-6 font-semibold text-panel"
            >
              Join the Senbud waitlist
            </Link>
          </div>
        </section>

        <section className={`${wrap} py-16 sm:py-20`}>
          <h2 className={h2}>
            Senbud vs <span className="marker">{alt.name}</span>
          </h2>
          <div className="mt-10 overflow-x-auto rounded-3xl bg-paper-2 ring-1 ring-line">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-5 text-sm font-medium text-ink-dim">
                    <span className="sr-only">Compared on</span>
                  </th>
                  <th scope="col" className="p-5 text-lg font-semibold">
                    Senbud
                  </th>
                  <th scope="col" className="p-5 text-lg font-semibold">
                    {alt.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map(([label, key]) => (
                  <tr key={key}>
                    <th scope="row" className="p-5 text-sm font-medium text-ink-dim">
                      {label}
                    </th>
                    <td className="p-5">{SENBUD[key]}</td>
                    <td className="p-5">{alt[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-dim">
            {alt.name} details checked in October 2026 from{" "}
            <a href={alt.source} className="underline underline-offset-4" rel="noopener">
              their own page
            </a>
            . Prices can change; check before you buy.
          </p>
        </section>

        <section className={`${wrap} grid gap-4 pb-20 sm:pb-28 md:grid-cols-2`}>
          <div className="rounded-3xl bg-paper-2 p-7 ring-1 ring-line">
            <h2 className="text-xl font-semibold">Pick {alt.name} if</h2>
            <ul className="mt-5 space-y-3">
              {alt.pickThemIf.map((p) => (
                <li key={p} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-ink-dim" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-panel p-7 text-on-panel">
            <h2 className="text-xl font-semibold">Pick Senbud if</h2>
            <ul className="mt-5 space-y-3">
              {alt.pickSenbudIf.map((p) => (
                <li key={p} className="flex gap-3">
                  <Check size={18} className="mt-0.5 shrink-0 text-hl" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <Link
              href="/#waitlist"
              className="hl-sweep mt-8 inline-flex min-h-11 items-center rounded-full bg-hl px-6 font-semibold text-panel"
            >
              Join the waitlist
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
