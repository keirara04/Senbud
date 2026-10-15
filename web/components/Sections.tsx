import { Camera, Keyboard, Lock, MessageSquareText, MonitorSmartphone, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";

export const wrap = "mx-auto max-w-6xl px-4 sm:px-6";
export const h2 = "font-display text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.06]";

export function Problem() {
  return (
    <section className={`${wrap} py-20 sm:py-28`}>
      <p className={`${h2} max-w-4xl`}>
        Most budget apps want your bank password or your patience. Senbud needs neither.
      </p>
      <div className="mt-10 grid max-w-4xl gap-8 text-lg leading-relaxed text-ink-dim sm:grid-cols-2">
        <p>Linking a bank account to an app you found last week feels like a lot to ask. So people don’t.</p>
        <p>Typing in every coffee and bus fare gets old by week two. So people stop.</p>
      </div>
    </section>
  );
}

const ways = [
  {
    icon: Camera,
    title: "Snap it",
    body: "Take a photo of a receipt or a screenshot of your banking app. Senbud reads the shop, amount and date.",
    sample: "IMG_2041.jpg → Mamak · $8.40",
  },
  {
    icon: MessageSquareText,
    title: "Type it like a text",
    body: "Write the way you’d tell a friend. One line can hold a whole day.",
    sample: "lunch 12, grab 8, kopi 4",
  },
  {
    icon: Keyboard,
    title: "Or tap it in yourself",
    body: "Amount first, then a category. Two taps, no AI involved, and it works offline.",
    sample: "12 → Food → done",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-t border-line">
      <div className={`${wrap} grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div>
          <h2 className={h2}>Three ways to add spending. Pick the lazy one.</h2>
          <p className="mt-5 max-w-md text-lg text-ink-dim">
            Every entry lands in the same place, so your budget, rent and treats stay up to date whichever way you
            use.
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {ways.map(({ icon: Icon, title, body, sample }) => (
            <li key={title} className="grid gap-3 py-7 sm:grid-cols-[auto_1fr] sm:gap-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-hl/20 text-accent-ink">
                <Icon size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-1.5 text-ink-dim">{body}</p>
                <p className="mt-3 inline-block rounded-md bg-receipt px-2.5 py-1 font-mono text-[13px] text-receipt-ink ring-1 ring-black/5">
                  {sample}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Column({ icon, title, children, tone }: { icon: ReactNode; title: string; children: ReactNode; tone: string }) {
  return (
    <div className={`rounded-3xl p-6 sm:p-8 ${tone}`}>
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

export function Privacy() {
  return (
    <section className="bg-panel text-on-panel">
      <div className={`${wrap} py-20 sm:py-28`}>
        <h2 className={`${h2} max-w-3xl`}>Here’s exactly where your money data goes.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Column icon={<MonitorSmartphone className="text-mint" aria-hidden="true" />} title="Stays on your device" tone="bg-panel-2">
            <li>Every transaction, budget and receipt photo</li>
            <li>Your rent, treats and friends’ IOUs</li>
            <li>Export it all as a CSV whenever you like</li>
          </Column>
          <Column icon={<Lock className="text-hl" aria-hidden="true" />} title="Sent to the AI, if you turn it on" tone="bg-panel-2">
            <li>Only the photo or line you’re adding right now</li>
            <li>A short summary of this month to answer questions</li>
            <li>Nothing is kept on Senbud’s servers</li>
          </Column>
          <Column icon={<ShieldOff className="text-coral" aria-hidden="true" />} title="Never" tone="bg-panel-2">
            <li>Your bank login or card numbers</li>
            <li>Ads, or selling your data</li>
            <li>Locking your data behind a paywall</li>
          </Column>
        </div>
        <p className="mt-8 max-w-2xl text-on-panel-dim">
          Because your data lives in your browser, clearing your browser data deletes it. Senbud reminds you to
          export a backup, and the file is yours to keep.
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className={`${wrap} flex flex-col gap-4 py-10 text-sm text-ink-dim sm:flex-row sm:items-center sm:justify-between`}>
        <p>© 2026 Senbud. Senbud is a budgeting tool, not financial advice.</p>
        <nav aria-label="Footer" className="flex gap-5 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
      </div>
    </footer>
  );
}
