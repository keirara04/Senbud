"use client";

import { motion } from "motion/react";
import { Check, Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

export function Confirmed() {
  const params = useSearchParams();
  const code = params.get("code");
  const invalid = params.get("status") === "invalid" || (code !== null && !/^[\w-]{4,32}$/.test(code));
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const link = code ? `${typeof location === "undefined" ? "" : location.origin}/?ref=${code}` : "";

  useEffect(() => {
    if (copy === "idle") return;
    const t = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(t);
  }, [copy]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="relative flex w-full flex-col items-center">
      <Link href="/" aria-label="Senbud home" className="mb-10 inline-flex min-h-11 items-center">
        <Logo />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: -40, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="w-full max-w-sm drop-shadow-[0_24px_30px_rgb(0_0_0/0.35)]"
      >
        <div className="receipt relative px-7 pb-9 pt-8 font-mono text-[13px]">
          <p className="uppercase tracking-wider text-receipt-ink/75">Senbud · early access</p>
          <div className="my-3 border-t border-dashed border-receipt-ink/25" />
          {invalid ? (
            <>
              <p className="font-sans text-xl font-semibold">This link has expired.</p>
              <p className="mt-1 text-receipt-ink/75">Confirmation links last 7 days and work once. Join again to get a fresh one.</p>
            </>
          ) : code ? (
            <>
              <p className="font-sans text-xl font-semibold">Your spot is confirmed.</p>
              <p className="mt-1 text-receipt-ink/75">We’ll email you when early access opens.</p>
              <motion.p
                initial={{ opacity: 0, scale: 1.8, rotate: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: -12 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 420, damping: 16 }}
                className="absolute right-5 top-12 rounded-lg border-[3px] border-[#1f3fd8] px-3 py-1 font-sans text-lg font-black uppercase tracking-wide text-[#1f3fd8]"
              >
                You’re in
              </motion.p>
            </>
          ) : (
            <>
              <p className="font-sans text-xl font-semibold">Check your inbox.</p>
              <p className="mt-1 text-receipt-ink/75">Tap the link in our email to confirm your spot.</p>
            </>
          )}
        </div>
      </motion.div>

      {code && !invalid && (
        <div className="mt-10 w-full max-w-md rounded-3xl bg-panel-2 p-6">
          <h1 className="text-lg font-semibold">Move up the list</h1>
          <p className="mt-1 text-on-panel-dim">Friends who join and confirm through your link move you up the list.</p>
          <p className="mt-4 truncate rounded-xl bg-panel px-4 py-3 font-mono text-sm ring-1 ring-panel-line">{link}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copyLink} className="plausible-event-name=Referral+copy hl-sweep inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-hl font-semibold text-panel">
              {copy === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span aria-live="polite">{{ idle: "Copy link", copied: "Copied", failed: "Copy failed" }[copy]}</span>
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={() => navigator.share({ title: "Senbud", text: "The budget app that does the boring part.", url: link }).catch(() => {})}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold ring-1 ring-panel-line hover:bg-white/10"
              >
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>
            )}
          </div>
        </div>
      )}

      <Link href={invalid ? "/#waitlist" : "/"} className="mt-8 inline-flex min-h-11 items-center rounded-full px-5 font-semibold ring-1 ring-panel-line hover:bg-white/10">
        {invalid ? "Join again" : "Back to Senbud"}
      </Link>
    </div>
  );
}
