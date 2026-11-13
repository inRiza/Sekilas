import {
  CtaBand,
  DashboardShowcase,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
  Recommendations,
  Statement,
  Trust,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Statement />
        <HowItWorks />
        <DashboardShowcase />
        <Recommendations />
        <Trust />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
