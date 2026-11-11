import {
  CtaBand,
  DashboardShowcase,
  Footer,
  Hero,
  HowItWorks,
  Navbar,
  Recommendations,
  Stats,
  Trust,
} from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Stats />
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
