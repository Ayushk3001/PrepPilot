'use client';

import { useEffect } from "react";
import Lenis from "lenis";
import Nav from "@/features/landing/components/Nav";
import Hero from "@/features/landing/components/Hero";
import Marquee from "@/features/landing/components/Marquee";
import ResumeGrounding from "@/features/landing/components/ResumeGrounding";
import RoundsMatrix from "@/features/landing/components/RoundsMatrix";
import AgentShowcase from "@/features/landing/components/AgentShowcase";
import PracticeDemo from "@/features/landing/components/PracticeDemo";
import Bento from "@/features/landing/components/Bento";
import Method from "@/features/landing/components/Method";
import FaqSection from "@/features/landing/components/FaqSection";
import Footer from "@/features/landing/components/Footer";

export default function Landing() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 });
    let raf: number;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <ResumeGrounding />
        <RoundsMatrix />
        <AgentShowcase />
        <PracticeDemo />
        <Bento />
        <Method />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
