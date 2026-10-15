import { Brain } from "@/components/Brain";
import { Faq, Pricing, Waitlist } from "@/components/Convert";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Footer, HowItWorks, Privacy, Problem } from "@/components/Sections";
import { Split, Wrapped } from "@/components/Social";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ledgerly",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: "A budgeting app for students that logs spending from receipts or a quick line of text, without a bank login.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro yearly", price: "39", priceCurrency: "USD" },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Brain />
        <Split />
        <Wrapped />
        <Privacy />
        <Pricing />
        <Faq />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}
