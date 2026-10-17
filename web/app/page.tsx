import { Also, Faq, Friends, Hero, Join, MeetBud, Privacy, Ways } from "@/components/Landing";
import { Pricing } from "@/components/Pricing";
import { Screens } from "@/components/Screens";
import { MotionProvider } from "@/components/MotionProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Sections";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Senbud",
  applicationCategory: "FinanceApplication",
  operatingSystem: "iOS, Android",
  description: "A budgeting app for students that tells you what's safe to spend today, from receipts or a quick line of text, without a bank login or an account.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro yearly", price: "39", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
    { "@type": "Offer", name: "Pro monthly", price: "4.99", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <MotionProvider>
        <main className="lp">
          <Hero />
          <Ways />
          <Screens />
          <MeetBud />
          <Friends />
          <Privacy />
          <Also />
          <Pricing />
          <Faq />
          <Join />
        </main>
      </MotionProvider>
      <Footer />
    </>
  );
}
