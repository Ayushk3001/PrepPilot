// @ts-nocheck
'use client';

import { useState } from "react";
import { Link } from "@/lib/routerCompat";
import { 
  FileText, ArrowRight, Sparkles, CheckCircle2, 
  GitBranch, Database, Cpu, ShieldCheck, CornerDownRight, Zap 
} from "lucide-react";
import { Reveal, SectionTag } from "@/components/ui-bits";

const SAMPLE_RESUME_SNIPPET = {
  candidate: "Alex Chen",
  targetRole: "Staff Software Engineer / Distributed Systems",
  experience: {
    company: "Apex Cloud Technologies",
    role: "Senior Infrastructure Engineer",
    period: "2022 – 2025",
    bullets: [
      "Architected event-driven ingestion pipeline processing 45,000 msg/sec with Apache Kafka and Go, reducing data loss from 0.4% to 0.001%.",
      "Led migration from monolithic PostgreSQL to distributed CockroachDB cluster across 3 AWS regions with zero downtime during peak holiday load.",
      "Championed automated canary deployment pipeline using ArgoCD and Prometheus, shrinking rollback MTTR from 45 min to under 90 seconds."
    ]
  },
  extractedNodes: [
    {
      id: "node_1",
      topic: "Kafka Ingestion Pipeline (45k msg/sec)",
      category: "Architecture & Scale",
      metrics: ["45,000 msg/sec", "0.4% → 0.001% data loss"],
      tech: ["Apache Kafka", "Go", "Distributed Queues"],
      probeQuestion: "How did you configure consumer group rebalances and offset commits in Kafka to guarantee near-zero data loss at 45k msg/sec without causing backpressure cascades?",
      expectedCompetency: "System Reliability & Concurrency"
    },
    {
      id: "node_2",
      topic: "CockroachDB Multi-Region Migration",
      category: "Data Integrity & Risk",
      metrics: ["3 AWS Regions", "Zero downtime", "Peak holiday load"],
      tech: ["CockroachDB", "PostgreSQL", "Raft Consensus"],
      probeQuestion: "What consensus latency trade-offs did you encounter with Raft replicas across 3 AWS regions, and how did you prevent distributed transaction timeouts under peak load?",
      expectedCompetency: "Distributed Consensus & Trade-offs"
    },
    {
      id: "node_3",
      topic: "Canary Deployment MTTR Reduction",
      category: "Operational Leadership",
      metrics: ["45 min → 90 sec MTTR", "ArgoCD", "Prometheus"],
      tech: ["ArgoCD", "Kubernetes", "Prometheus Metrics"],
      probeQuestion: "Walk me through a production failure where your automated canary alert fired. What specific Prometheus telemetry triggered the automatic rollback?",
      expectedCompetency: "Crisis Response & STAR Structure"
    }
  ]
};

export default function ResumeGrounding() {
  const [activeNode, setActiveNode] = useState(0);
  const node = SAMPLE_RESUME_SNIPPET.extractedNodes[activeNode];

  return (
    <section id="evidence" className="border-t-3 border-line bg-paper py-20 sm:py-28" data-testid="landing-evidence-section">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTag>THE CORE DIFFERENTIATOR</SectionTag>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="max-w-3xl font-display text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] text-ink">
                FROM STATIC RESUME TO AN <br />
                <span className="bg-[#C7FF2F] px-2 py-0.5 border-2 border-line inline-block mt-1">
                  ACTIVE EVIDENCE GRAPH.
                </span>
              </h2>
            </div>
            <p className="max-w-md font-sans text-sm sm:text-base leading-relaxed text-ink2 font-medium">
              Generic interview bots ask generic canned prompts. PrepPilot ingests your PDF or DOCX, parses your actual projects, verified metrics, and tech stacks, then cross-examines what you actually built.
            </p>
          </div>
        </Reveal>

        {/* 2-Column Interactive Grounding Canvas */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Parsed Resume Artifact */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border-3 border-line bg-white shadow-[6px_6px_0_#111111] overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-line bg-ink px-4 py-2.5 font-mono text-xs text-paper">
                <span className="flex items-center gap-2 font-bold uppercase text-[#C7FF2F]">
                  <FileText className="h-3.5 w-3.5" /> RESUME_SOURCE_INGESTION
                </span>
                <span className="bg-[#C7FF2F] text-ink text-[10px] font-black px-1.5 py-0.2">PARSED</span>
              </div>

              <div className="p-5 font-mono text-xs space-y-4 bg-paper/50">
                <div className="border-b-2 border-line pb-3">
                  <p className="text-[10px] uppercase text-mut font-bold">CANDIDATE PROFILE</p>
                  <p className="text-sm font-black text-ink uppercase">{SAMPLE_RESUME_SNIPPET.candidate}</p>
                  <p className="text-[11px] text-[#127533] font-bold mt-0.5">{SAMPLE_RESUME_SNIPPET.targetRole}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-ink uppercase">{SAMPLE_RESUME_SNIPPET.experience.company}</span>
                    <span className="text-[10px] text-mut">{SAMPLE_RESUME_SNIPPET.experience.period}</span>
                  </div>
                  <p className="text-[11px] font-bold text-ink2 italic">{SAMPLE_RESUME_SNIPPET.experience.role}</p>

                  <div className="space-y-2 pt-2">
                    {SAMPLE_RESUME_SNIPPET.experience.bullets.map((b, i) => (
                      <div 
                        key={i} 
                        onClick={() => setActiveNode(i)}
                        className={`p-2.5 border-2 text-[11px] leading-relaxed transition-all cursor-pointer ${
                          activeNode === i 
                            ? "border-line bg-[#C7FF2F] text-ink font-bold shadow-[3px_3px_0_#111111]" 
                            : "border-line/40 bg-white text-ink2 hover:border-line"
                        }`}
                      >
                        <span className="text-[9px] font-mono text-mut block uppercase mb-1">
                          [ EVIDENCE NODE 0{i + 1} // CLICK TO PROBE ]
                        </span>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-line bg-white px-5 py-3 flex items-center justify-between font-mono text-[11px]">
                <span className="text-mut uppercase font-bold">PARSER ACCURACY:</span>
                <span className="text-ink font-bold bg-[#E2F8E7] text-[#127533] px-2 py-0.5 border border-line">
                  100% DETERMINISTIC GRAPH
                </span>
              </div>
            </div>

            <div className="border-2 border-line bg-paper p-4 font-mono text-xs flex items-center gap-3 shadow-[3px_3px_0_#111111]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] font-bold text-ink">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="text-[11px] text-ink2 leading-tight">
                <strong>Privacy Guaranteed:</strong> Resumes are parsed locally in browser memory or confidential session caches. Never retained or trained on.
              </p>
            </div>
          </div>

          {/* Right Column: AI Probing Cross-Examination Engine */}
          <div className="lg:col-span-7">
            <div className="border-3 border-line bg-white shadow-[6px_6px_0_#111111] overflow-hidden">
              {/* Cockpit Header */}
              <div className="flex flex-wrap items-center justify-between border-b-2 border-line bg-white px-6 py-3 font-mono text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 bg-[#C7FF2F] border border-line animate-pulse" />
                  <span className="text-ink uppercase tracking-wider">RESUME_INTERVIEWER_AGENT // TELEMETRY</span>
                </div>
                <span className="border border-line bg-[#FFEFEA] text-[#FF5C35] px-2 py-0.5 text-[10px] font-bold uppercase">
                  ACTIVE CROSS-EXAMINATION
                </span>
              </div>

              {/* Node Selector Strip */}
              <div className="grid grid-cols-3 border-b-2 border-line bg-paper font-mono text-xs">
                {SAMPLE_RESUME_SNIPPET.extractedNodes.map((n, idx) => (
                  <button
                    key={n.id}
                    onClick={() => setActiveNode(idx)}
                    className={`p-3 text-left border-r-2 border-line last:border-r-0 transition-colors cursor-pointer ${
                      activeNode === idx ? "bg-[#C7FF2F] font-bold text-ink" : "bg-white text-mut hover:bg-paper"
                    }`}
                  >
                    <span className="text-[9px] block uppercase text-mut">NODE 0{idx + 1}</span>
                    <span className="truncate block font-bold text-[11px]">{n.category}</span>
                  </button>
                ))}
              </div>

              {/* Active Probing Dossier */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#127533] bg-[#E2F8E7] px-2 py-0.5 border border-line">
                      GROUNDED CLAIM: {node.topic}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-mut">
                      AXIS: {node.expectedCompetency}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-2xl sm:text-3xl font-bold uppercase text-ink leading-tight">
                    "{node.probeQuestion}"
                  </h3>
                </div>

                {/* Evidence Decomposition Tags */}
                <div className="border-2 border-line bg-paper p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-line/40 pb-2">
                    <span className="text-[10px] font-bold uppercase text-mut">EXTRACTED EVIDENCE VECTORS</span>
                    <span className="text-[10px] text-ink font-bold">[VERIFIED IN RESUME]</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-mut uppercase font-bold">Quantified Metrics:</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {node.metrics.map((m) => (
                          <span key={m} className="border border-line bg-white px-2 py-0.5 text-[10px] font-bold text-ink">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-mut uppercase font-bold">Tech Stack Entities:</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {node.tech.map((t) => (
                          <span key={t} className="border border-line bg-ink text-[#C7FF2F] px-2 py-0.5 text-[10px] font-bold">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why This Beats Generic Tools */}
                <div className="border-2 border-line bg-coal p-5 text-paper space-y-3 shadow-[4px_4px_0_#111111]">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase">
                    <span className="text-[#C7FF2F] font-bold flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> HOW THE AGENT PROBES YOU IN THE COCKPIT
                    </span>
                    <span className="text-paper/60">ADAPTIVE TREE</span>
                  </div>
                  <p className="font-mono text-xs leading-relaxed text-paper/90">
                    If your answer is too high-level, the agent automatically interrupts with:
                    <span className="text-[#C7FF2F] block mt-1 font-bold">
                      ↳ "You mentioned improving latency, but which specific database isolation level did you choose, and what was the impact on p99 write contention?"
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    to="/app/practice"
                    className="btn-terra !px-6 !py-3 !text-xs font-mono font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>TEST YOUR RESUME NOW →</span>
                  </Link>
                  <span className="font-mono text-[10px] text-mut uppercase font-bold hidden sm:inline">
                    WORKS WITH ANY TECH / LEADERSHIP ROLE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
