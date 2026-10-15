import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Page not found · Senbud" };

// A receipt for a page that doesn't exist.
export default function NotFound() {
  return (
    <main id="top" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-panel px-4 py-16 text-on-panel">
      <div aria-hidden="true" className="grid-paper pointer-events-none absolute inset-0" />
      <Link href="/" aria-label="Senbud home" className="relative mb-10 inline-flex min-h-11 items-center">
        <Logo />
      </Link>
      <div className="relative w-full max-w-sm -rotate-2 drop-shadow-[0_24px_30px_rgb(0_0_0/0.35)]">
        <div className="receipt px-7 pb-9 pt-8 font-mono text-[13px]">
          <p className="flex justify-between uppercase tracking-wider text-receipt-ink/75">
            <span>Senbud</span>
            <span>Error 404</span>
          </p>
          <div className="my-3 border-t border-dashed border-receipt-ink/25" />
          <p className="flex gap-2">
            <span>This page</span>
            <span className="dotted-leader" />
            <span>$0.00</span>
          </p>
          <p className="mt-1 flex gap-2">
            <span>Times we looked</span>
            <span className="dotted-leader" />
            <span>3</span>
          </p>
          <div className="my-3 border-t border-dashed border-receipt-ink/25" />
          <p className="font-sans text-xl font-semibold">Item not found.</p>
          <p className="mt-1 text-receipt-ink/75">The link may be old, or the page moved.</p>
        </div>
      </div>
      <Link href="/" className="hl-sweep relative mt-10 inline-flex min-h-11 items-center rounded-full bg-hl px-6 font-semibold text-panel">
        Back to Senbud
      </Link>
    </main>
  );
}
