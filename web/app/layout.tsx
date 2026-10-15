import type { Metadata, Viewport } from "next";
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
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
