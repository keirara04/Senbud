import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirmed } from "@/components/Confirmed";

export const metadata: Metadata = {
  title: "You’re on the list · Senbud",
  robots: { index: false },
};

// The API's confirmation link redirects here with ?code=REFERRAL_CODE (or ?status=invalid).
export default function ConfirmedPage() {
  return (
    <main id="top" tabIndex={-1} className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-panel px-4 py-16 text-on-panel focus:outline-none">
      <div aria-hidden="true" className="grid-paper pointer-events-none absolute inset-0" />
      <Suspense>
        <Confirmed />
      </Suspense>
    </main>
  );
}
