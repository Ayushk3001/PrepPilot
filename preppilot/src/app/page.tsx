'use client';

import { useEffect } from "react";
import Lenis from "lenis";
import Nav from "@/features/landing/components/Nav";
import Hero from "@/features/landing/components/Hero";
import Marquee from "@/features/landing/components/Marquee";
import AgentShowcase from "@/features/landing/components/AgentShowcase";
import Bento from "@/features/landing/components/Bento";
import PracticeDemo from "@/features/landing/components/PracticeDemo";
import Method from "@/features/landing/components/Method";
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
        <AgentShowcase />
        <Bento />
        <PracticeDemo />
        <Method />
      </main>
      <Footer />
    </div>
  );
}
