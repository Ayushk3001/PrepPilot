# Preppilot Architecture

This document describes the architecture implemented in this repository as of September 2026. It is based on the source code, not on an earlier proposed architecture.

## 1. System summary

Preppilot is a Next.js 16 App Router application. The browser owns the product experience and local candidate/session state. Next.js route handlers provide server-side boundaries for resume processing, LLM calls, interview question generation, answer evaluation, and benchmark execution.

The application is not currently a set of independently deployed microservices. It is one deployable web application with these logical layers:

```text
Browser UI
  ├─ Landing, auth, onboarding, dashboard, practice, session, history, plan
  ├─ Web Speech API transcription when supported
  └─ localStorage/sessionStorage for profile, accounts, sessions, drafts and caches
          │ fetch()
          ▼
Next.js route handlers
  ├─ Resume upload and profile extraction
  ├─ Interview next-question orchestration
  ├─ Answer evaluation
  ├─ Generic LLM chat proxy
  └─ Benchmark execution
          │
          ├─ Resume parser + canonical schema + evidence graph
          ├─ Interview controller + LangGraph workflow
          ├─ Multi-agent evaluation orchestrator
          ├─ LLM provider adapter
          └─ Benchmark runner
          │
          ├─ OpenAI-compatible provider, when configured
          └─ Deterministic local fallback when unavailable or invalid
```

## 2. Implemented end-to-end flows

### 2.1 Resume onboarding

```text
PDF/DOCX/text upload
  → text extraction
  → readable-text validation
  → SHA-256 snapshot key and in-process cache
  → optional LLM JSON extraction
  → canonical profile validation/normalization
  → deterministic parser fallback if LLM parsing fails
  → browser profile persistence
  → ResumeKnowledgeModel/evidence graph for interviews
```

The implementation supports PDF and DOCX extraction plus plain text. PDF extraction tries `pdfjs-dist`, `pdf-parse`, and a raw stream fallback. DOCX extraction tries Mammoth and an XML fallback. The canonical profile contains basics, education, employment, internships, projects, skills, technologies, certifications, achievements, and domains.

Relevant code:

- `src/app/api/onboarding/resume/route.ts`
- `src/lib/resumeParser.ts`
- `src/lib/resume/resumeSchema.ts`
- `src/lib/resume/resumeKnowledge.ts`
- `src/app/onboarding/resume/page.tsx`
- `src/app/onboarding/profile/page.tsx`

### 2.2 Resume knowledge and question generation

`extractResumeKnowledge()` converts the canonical profile into a `ResumeKnowledgeModel`. `buildEvidenceGraph()` creates evidence items for experience, internships, projects, education, skills, and achievements. Each item carries facts, skills, technologies, metrics, competencies, coverage state, and exploration count.

The interviewer state tracks round and target role, difficulty, question limits, timing, question history, covered and remaining resume topics, prior turns, and evaluations. Question generation can use the OpenAI-compatible provider. It validates structured responses, rejects repeated questions, and falls back to deterministic resume-grounded questions. `InterviewController` decides whether a turn is allowed; the model does not override time or question limits.

Relevant code:

- `src/agents/resumeInterviewerAgent.ts`
- `src/lib/resume/resumeKnowledge.ts`
- `src/lib/interview/controller.ts`
- `src/lib/interview/graph.ts`
- `src/agents/questionAgent.ts`
- `src/agents/questionGenerationService.ts`
- `src/app/api/interviewer/next-question/route.ts`
- `src/app/api/agents/generate-question/route.ts`

### 2.3 Live practice session

The session page accepts typed responses and can use the browser Web Speech API for transcription. Speech metrics are derived locally from transcript text and duration: word count, words per minute, filler count, detected filler terms, and pacing assessment. There is no server-side audio streaming pipeline in this repository.

```text
Question
  → typed response or browser transcription
  → local speech metrics
  → /api/agents/evaluate
  → multi-agent evaluation
  → feedback shown in session UI
  → session record saved in browser storage
  → next question or completion
```

Relevant code:

- `src/app/app/session/page.tsx`
- `src/lib/audio/acousticAnalyzer.ts`
- `src/lib/coachEngine.ts`
- `src/app/api/agents/evaluate/route.ts`

### 2.4 Answer evaluation pipeline

The server evaluation path is implemented in `runMultiAgentInterviewCoaching()`:

```text
Candidate profile + question + answer + optional speech metrics
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
 Communication       Content          STAR
 analysis            evaluation       structure
          └──────────────┼──────────────┘
                         ▼
                  Coach synthesis
                         ▼
           Faithfulness + contract validation
                         ▼
              CoachingFeedback response
```

The three specialist evaluations are dispatched in parallel. The coach consumes their structured outputs and produces the final score, verdict, strengths, improvement areas, rewrite, adaptive follow-up, evidence, and recurring gap key.

The implemented specialists are:

1. `CommunicationAnalysisAgent` — clarity, conciseness, fillers, hedging, sentence/delivery signals, and evidence.
2. `ContentEvaluationAgent` — relevance, completeness, competency coverage, technical depth, measurement plans, outcomes, and evidence.
3. `StarStructureAgent` — Situation, Task, Action, Result presence and supporting excerpts.
4. `InterviewCoachAgent` — synthesis, coaching feedback, improved answer, follow-up, and recurring gap classification.

Question generation is a separate interviewer capability, not one of the three parallel answer evaluators. The product therefore has four evaluation components plus question-generation components; it is not a network of five independently deployed agents.

Relevant code:

- `src/agents/orchestrator.ts`
- `src/agents/communicationAnalysisAgent.ts`
- `src/agents/contentEvaluationAgent.ts`
- `src/agents/starStructureAgent.ts`
- `src/agents/interviewCoachAgent.ts`
- `src/lib/interview/evaluationContract.ts`
- `src/lib/interview/evaluationFaithfulness.ts`
- `src/lib/coachEngine.ts`

### 2.5 Fallback and validation behavior

The provider adapter is OpenAI-compatible and reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`. The default base URL and model are defined in `src/server/ai/llmClient.ts`.

Structured responses are validated before acceptance. Evaluation has bounded timeouts and a deliberate retry for certain invalid structured outputs. If a provider call, response parse, or schema validation fails, the orchestrator uses deterministic local agent implementations. The resume parser also falls back to deterministic parsing.

Faithfulness checks remove unsupported candidate claims, invented metrics, and unsupported personal ownership from final coaching output. These checks are application logic, not an external judge service.

Relevant code:

- `src/server/ai/llmClient.ts`
- `src/agents/offlineEngine.ts`
- `src/lib/interview/evaluationFaithfulness.ts`
- `src/lib/interview/evaluationContract.ts`

## 3. Persistence and state boundaries

The current persistence model is browser-first:

| Data | Current location | Durability |
|---|---|---|
| Active candidate profile | `localStorage` | Per browser/device |
| Local accounts and auth token | `localStorage` | Per browser/device; not server authentication |
| Active interview state | `sessionStorage` | Current browser session |
| Completed practice sessions | `localStorage` | Last 50 records in the browser |
| Roadmap cache and mastered milestones | `localStorage` | Per browser/device |
| Resume snapshot cache | Server process memory | Lost on restart; bounded in-process cache |
| `/api/onboarding/profile` profile | Server process memory | Shared process variable; lost on restart |

`src/lib/storage/sessionStore.ts` computes average score, average WPM, filler totals, recurring gaps, score trends, and competency averages. `src/lib/store.ts` provides browser-facing session/profile helpers used by the dashboard, history, and plan pages.

There is no database, ORM, server session store, object storage, queue, or user-isolated backend persistence in this repository. Authentication is a local browser account flow, not a production identity-provider integration.

## 4. Improvement plan

The plan page reads saved session records and identifies weak dimensions and recurring gaps. It then:

1. builds deterministic fallback roadmap nodes from observed gaps;
2. optionally calls the LLM chat route to generate a four-phase roadmap;
3. maps gaps to the curated resource catalog in `src/lib/resources.ts`;
4. generates practice MCQs for a roadmap milestone through the LLM route;
5. stores roadmap and milestone state in browser storage.

This is a client-side product flow. It does not currently write a durable updated candidate profile containing newly learned skills or verified progress.

Relevant code:

- `src/app/app/plan/page.tsx`
- `src/lib/resources.ts`
- `src/lib/storage/sessionStore.ts`
- `src/app/api/llm/chat/route.ts`

## 5. Observability and evaluation

`src/lib/interview/tracing.ts` creates structured interview and LLM trace records. Trace data includes request/session identifiers, stage, sender/receiver labels, payloads, status, latency, provider metadata, and safe fallback reasons. LangSmith integration is optional and disabled unless configured.

The benchmark route runs cases in `src/data/benchmarkDataset.ts` through the same evaluation orchestrator. It reports relevance, analysis quality, groundedness, usefulness, consistency, latency, and pass/warning status. Benchmark scores are application-level checks; they are not a separate production evaluation service.

Relevant code:

- `src/lib/interview/tracing.ts`
- `src/server/evaluation/benchmarkRunner.ts`
- `src/app/api/benchmark/run/route.ts`
- `src/data/benchmarkDataset.ts`

## 6. Repository structure

```text
src/
├─ app/                    # App Router pages, layouts, route handlers, styles
│  └─ api/                 # HTTP boundaries for resume, questions, evaluation, LLM, benchmark
├─ agents/                 # Questioning, evaluation, coaching, fallback implementations
├─ server/                 # Provider adapter and benchmark runner
├─ lib/
│  ├─ resume/              # Canonical schema, profile normalization, evidence graph
│  ├─ interview/           # LangGraph workflow, limits, tracing, evaluation safeguards
│  ├─ storage/             # Browser session storage and longitudinal metrics
│  ├─ dataset/              # Structured question dataset filtering/import
│  ├─ audio/                # Transcript-derived speech metrics
│  └─ ...                   # API helpers, resources, auth, UI-facing orchestration
├─ components/             # Shared UI components
├─ features/               # Auth and landing feature components
├─ data/                   # Versioned static datasets
└─ types/                  # Shared TypeScript contracts
```

Dependency intent is straightforward: route handlers translate HTTP to domain calls; agents own question/evaluation decisions; server modules own provider and benchmark concerns; resume/interview libraries own domain rules; browser pages own interaction and browser persistence.

## 7. Known architectural limitations

- Browser-local persistence means history and profiles do not follow a user across devices.
- The in-memory profile and resume caches are not durable or horizontally coordinated.
- Local auth does not provide server-side identity, authorization, or account recovery.
- The browser Web Speech API is availability-dependent and has no server audio fallback.
- `src/app/api/onboarding/profile/route.ts` uses one process-level profile variable, so it is not safe as a multi-user production store.
- Some legacy compatibility aliases remain in the profile and session types.
- The plan flow updates roadmap/milestone UI state, not a canonical long-term skill profile.

These limitations describe the current implementation; they are not recommendations for the target architecture.
