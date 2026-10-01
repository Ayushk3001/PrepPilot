// @ts-nocheck
'use client';

import { useState } from "react";
import { ChevronDown, HelpCircle, ShieldCheck, Zap } from "lucide-react";
import { Reveal, SectionTag } from "@/components/ui-bits";

const FAQS = [
  {
    q: "Do I need an OpenAI or Anthropic API key to practice?",
    a: "No! PrepPilot has a built-in deterministic local evaluation engine and offline fallback pipeline. You can run unlimited mock interviews right away without entering any API keys. If you want custom large language model inference, you can optionally connect your own Gemini or OpenAI API key in settings."
  },
  {
    q: "How does PrepPilot ground questions in my actual resume?",
    a: "When you upload or paste your resume, PrepPilot builds a structured Resume Evidence Graph. It extracts your verified projects, technologies, and quantified metrics (e.g., 'reduced latency by 40% with Kafka and Go'). The Question Agent uses these exact nodes to probe your actual technical decisions and trade-offs rather than asking generic textbook questions."
  },
  {
    q: "Can I practice with my voice / microphone or only text?",
    a: "Both! In the interview cockpit, you can enable microphone recording with native speech-to-text. The Communication Agent analyzes your live speech cadence, speaking speed in Words Per Minute (120–160 WPM ideal), and flags filler words ('um', 'like', 'basically'). You can also type your answers if you are in a quiet office or public space."
  },
  {
    q: "What makes the 5-Agent pipeline different from asking ChatGPT to mock interview me?",
    a: "Single LLM prompts suffer from leniency bias, hallucinated scores, and lack of structured memory. PrepPilot isolates 5 specialized roles: Question Calibrator, Speech Telemetry Analyzer, Domain Content Verifier, STAR Structure Parser, and Lead Synthesis Coach. They execute with formal Agent-to-Agent handoffs, citing verbatim evidence spans from your answers."
  },
  {
    q: "Is my resume or voice data stored securely?",
    a: "Your data stays strictly under your control. By default, your resume and session history are stored locally in your browser's client storage. We do not sell your data or train external AI models on candidate transcripts."
  },
  {
    q: "Which roles and interview rounds are supported?",
    a: "PrepPilot supports Software Engineering (SWE/Senior/Staff), AI/ML Systems Engineering, Product Management (PM), Cloud/DevOps, Data Analytics, and Engineering Management. You can practice across all 6 rounds: HR & Intro, Behavioral & STAR, Technical & Systems, Situational Problem Solving, Leadership, and Full Comprehensive Mock."
  }
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t-3 border-line bg-paper py-20 sm:py-28" data-testid="landing-faq-section">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <SectionTag>TACTICAL BRIEFING // FAQ</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-[0.95] text-ink">
                FREQUENTLY ASKED <br />
                <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line inline-block mt-1">
                  QUESTIONS.
                </span>
              </h2>
            </div>
            <p className="font-mono text-xs text-mut font-bold uppercase">
              [ 6 CRITICAL CLARIFICATIONS ]
            </p>
          </div>
        </Reveal>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <Reveal key={idx} delay={idx * 0.05}>
                <div className="border-3 border-line bg-white shadow-[4px_4px_0_#111111] overflow-hidden">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left font-mono transition-colors hover:bg-paper cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xs font-black text-mut">0{idx + 1}</span>
                      <span className="font-display text-base sm:text-lg font-bold uppercase text-ink">
                        {faq.q}
                      </span>
                    </span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-line bg-paper transition-transform duration-200 ${isOpen ? "rotate-180 bg-[#C7FF2F]" : ""}`}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-line bg-paper p-5 font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
                      {faq.a}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
