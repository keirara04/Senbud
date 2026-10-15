import { Brain } from "@/components/Brain";
import { Faq, Pricing, Waitlist } from "@/components/Convert";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { MotionProvider } from "@/components/MotionProvider";
import { Nav } from "@/components/Nav";
import { PlayTeaser } from "@/components/PlayTeaser";
import { Privacy } from "@/components/Privacy";
import { Footer, Problem } from "@/components/Sections";
import { Split, Wrapped } from "@/components/Social";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Senbud",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: "A budgeting app for students that logs spending from receipts or a quick line of text, without a bank login.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro yearly", price: "39", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <MotionProvider>
        <main>
          <Hero />
          <Problem />
          <HowItWorks />
          <Brain />
          <Split />
          <Wrapped />
          <PlayTeaser />
          <Privacy />
          <Pricing />
          <Faq />
          <Waitlist />
        </main>
      </MotionProvider>
      <Footer />
    </>
  );
}
