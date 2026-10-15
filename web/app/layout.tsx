import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const title = "Senbud — the money buddy that does the boring part";
const description =
  "Snap a receipt or type “lunch 12, grab 8”. Senbud logs it, counts down to rent, and tells you when you can afford a treat. No bank password needed.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  openGraph: { title, description, type: "website", siteName: "Senbud" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#1f3fd8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-dvh">
        {/* First thing keyboard users reach: jump past the nav to the page content (id="top" on every page). */}
        <a
          href="#top"
          className="sr-only z-[60] rounded-full bg-hl px-4 py-2 font-semibold text-panel focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
        >
          Skip to content
        </a>
        <SmoothScroll />
        {/* Cookie-free analytics (Plausible), only when configured. CTA clicks are counted from their
            plausible-event-* class names; no personal data or cookies. */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.tagged-events.js"}
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
