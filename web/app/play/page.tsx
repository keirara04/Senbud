import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Game } from "@/components/play/Game";

const title = "The Budget Dungeon: can you survive the week?";
const description =
  "A 2-minute dice-rolling mini game from Senbud. Beat the Impulse Goblin, cancel the Subscription Slime and pay the Rent Dragon on Friday.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", siteName: "Senbud", url: "/play" },
  twitter: { card: "summary_large_image", title, description },
};

export default function PlayPage() {
  return (
    <div className="min-h-dvh bg-panel text-on-panel">
      <header className="border-b border-panel-line">
        <nav aria-label="Main" className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="Senbud home" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-on-panel-dim hover:text-on-panel"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Senbud
          </Link>
        </nav>
      </header>
      <main className="relative overflow-hidden">
        {/* Same soft glow as the landing hero. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-white/15 blur-[120px]"
        />
        <div className="relative">
          <Game />
        </div>
      </main>
      <footer className="border-t border-panel-line px-4 py-8 text-center text-sm text-on-panel-dim sm:px-6">
        A game about budgeting, not financial advice. © 2026 Senbud.
      </footer>
    </div>
  );
}
