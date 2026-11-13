import {
  CtaBand,
  ExampleAnalysis,
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
        <Recommendations />
        <ExampleAnalysis />
        <Trust />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
