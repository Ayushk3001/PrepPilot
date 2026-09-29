import { BenchmarkTestCase } from '@/types/interview';
import { INITIAL_INTERVIEW_DATASET } from './interviewDataset';

export const BENCHMARK_TEST_CASES: BenchmarkTestCase[] = [
  {
    id: 'bench-001',
    title: 'Behavioral Disagreement - Missing Quantifiable Result',
    question: INITIAL_INTERVIEW_DATASET[2], // beh-001
    candidateResponse: 'In my last project, our backend dev wanted to use MongoDB for order processing, but I wanted PostgreSQL for ACID transactions. We debated back and forth for days. Finally, I showed him a blog post about banking systems and he agreed to switch. We finished the project.',
    expectedDeficiency: 'Candidate misses quantifiable business results (latency, error reduction, cost), lacks formal benchmarking proof, and provides weak resolution narrative.'
  },
  {
    id: 'bench-002',
    title: 'Telecom 5G OSS/BSS - High Jargon Without Architectural Substance',
    question: INITIAL_INTERVIEW_DATASET[4], // tech-001
    candidateResponse: 'OSS and BSS in 5G SA use cloud native microservices with REST APIs. When a subscriber activates a plan, the CRM sends a payload and the NFV configures the 5G network slice. Everything is automated with Kubernetes and CI/CD pipelines.',
    expectedDeficiency: 'Fails to mention TM Forum ODA standards (TMF622, TMF641), misses separation between Customer Facing Services (CFS) and Resource Facing Services (RFS), and ignores event-driven decoupling (Kafka).'
  },
  {
    id: 'bench-003',
    title: 'Production Outage - Blaming Others & No Root Cause Action',
    question: INITIAL_INTERVIEW_DATASET[3], // beh-002
    candidateResponse: 'A junior developer pushed bad code on Friday without testing that took down our user login portal. Customers were angry and tweeting. I saw the error in the logs, messaged him on Slack to revert his PR, and warned him to be more careful next time. After that, the system was back up.',
    expectedDeficiency: 'Violates blameless post-mortem culture, lacks systematic root cause analysis, omits automated CI/CD guardrails or canary deploys, and provides no recovery SLA metrics.'
  },
  {
    id: 'bench-004',
    title: 'Monolith to Microservices Executive Pitch - Overly Technical Jargon',
    question: INITIAL_INTERVIEW_DATASET[7], // exec-001
    candidateResponse: 'You should migrate to microservices because monolithic codebases suffer from high cyclomatic complexity and monolithic deploy locks. With microservices, we break domain contexts into containerized pods running Envoy sidecars on Kubernetes with Istio service mesh and gRPC protobufs. This improves your DevOps DORA metrics.',
    expectedDeficiency: 'Overwhelms non-technical C-level executives with acronyms (Envoy, Istio, gRPC, DORA), fails to explain business revenue impact, and ignores migration risks/trade-offs.'
  },
  {
    id: 'bench-005',
    title: 'RAG Architecture - Exemplary High-Depth Answer',
    question: INITIAL_INTERVIEW_DATASET[6], // tech-003
    candidateResponse: 'To mitigate hallucinations and maximize retrieval precision in enterprise RAG, I implement a tiered pipeline: first, document chunking with 15% sliding overlap; second, hybrid search fusing semantic dense embeddings with BM25 keyword search via Reciprocal Rank Fusion; third, a Cross-Encoder reranker narrowing candidate chunks down to the top 4; and finally, an LLM citation verification step validating all claims against retrieved text before streaming.',
    expectedDeficiency: 'Exemplary response. Evaluator should award high scores (>90%) across relevance, technical depth, and structure.'
  }
];
