# Preppilot

Preppilot is a Next.js application for resume-grounded interview practice and communication coaching. Candidates upload a resume, practice typed or spoken answers, receive structured feedback from specialist evaluators, review session trends, and follow a gap-based improvement plan.

The implementation is a single Next.js application with browser-first persistence. For the source-based architecture description, see [ARCHITECTURE.md](./ARCHITECTURE.md). For product/UI decisions, see [DESIGN_AND_ARCHITECTURE.md](./DESIGN_AND_ARCHITECTURE.md).

## What is implemented

- PDF, DOCX, and text resume ingestion;
- LLM-assisted resume structuring with deterministic parser fallback;
- canonical candidate profile validation and resume evidence graph;
- HR, behavioral, technical, situational, leadership, and mock interview rounds;
- resume-grounded questions and adaptive follow-ups;
- browser Web Speech API transcription when available, with typed input;
- transcript-derived WPM, filler-word, and pacing metrics;
- parallel communication, content, and STAR evaluation;
- coach synthesis with score, verdict, evidence, rewrite, and follow-up;
- faithfulness and structured-output validation;
- browser-persisted session history and recurring-gap metrics;
- curated learning resources, roadmap generation, and milestone MCQs;
- optional LLM benchmark execution and interview/LLM diagnostics;
- deterministic fallback behavior when no provider is configured or a provider response is unusable.

## Runtime architecture

```text
Browser pages and components
  → Next.js route handlers
  → domain modules and agents
  → OpenAI-compatible LLM provider when configured
  → deterministic local fallback when needed
  → browser session/profile storage
```

Answer evaluation:

```text
Question + candidate answer
  → Communication analysis ┐
  → Content evaluation     ├→ Coach synthesis → contract/faithfulness checks → UI feedback
  → STAR analysis          ┘
```

Question generation is a separate flow using `ResumeInterviewerAgent`, a deterministic controller, and a LangGraph workflow. It tracks question limits, duration, history, covered resume topics, and follow-up limits.

## Technology

- Next.js 16.3 App Router
- React 19
- TypeScript 5
- Tailwind CSS v4 and project CSS tokens
- Framer Motion for selected UI transitions
- LangGraph for the interview question workflow
- OpenAI-compatible SDK/provider adapter
- Mammoth for DOCX extraction
- `pdfjs-dist`/`pdf-parse` extraction paths
- Node test runner through `tsx`

## Requirements

- Node.js 18 or newer; Node.js 20+ is recommended
- npm
- Optional OpenAI-compatible provider credentials for LLM-backed behavior

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and configure the provider if desired:

```env
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_MODEL=your-model-name
LANGSMITH_API_KEY=
LANGSMITH_TRACING=false
LANGSMITH_PROJECT=preppilot
```

The application can run without an API key using deterministic and curated fallbacks. Do not commit real credentials.

## Commands

```bash
npm run dev       # start local development server
npm run build     # create a production build
npm run start     # serve the production build
npm run lint      # run ESLint
npm test          # run the automated test suite
```

Open [http://localhost:3000](http://localhost:3000) after starting the development server.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/signup`, `/login` | Browser-local account flow |
| `/onboarding/resume` | Resume upload and extraction |
| `/onboarding/profile` | Profile review and editing |
| `/app` | Candidate dashboard |
| `/app/practice` | Practice setup |
| `/app/session` | Live interview session and feedback |
| `/app/sessions` | Session history and trends |
| `/app/plan` | Improvement roadmap, resources, and assessment |
| Landing agent sections | Agent/pipeline explanation in the landing experience |

## API routes

| Route | Purpose |
|---|---|
| `POST /api/onboarding/resume` | Extract and normalize a resume |
| `GET/PUT /api/onboarding/profile` | Process-level profile helper; not durable multi-user storage |
| `POST /api/interviewer/next-question` | Run the LangGraph next-question flow |
| `POST /api/agents/generate-question` | Select or generate a dataset/profile question |
| `POST /api/agents/evaluate` | Run the multi-agent answer evaluation |
| `POST /api/llm/chat` | Server-side OpenAI-compatible chat proxy |
| `POST /api/benchmark/run` | Run benchmark cases through the evaluation pipeline |

## Storage model

The current prototype stores most user-facing state in the browser:

- profile, local accounts, token, roadmap cache, and mastered milestones in `localStorage`;
- active interview state and opening-question cache in `sessionStorage`;
- up to 50 completed session records in browser storage;
- resume snapshots and the profile API helper in process memory on the server.

There is currently no database, durable backend account system, object storage, queue, or server-side audio store. Data is therefore device/browser scoped and can be lost when browser storage is cleared or the server process restarts.

## Repository map

```text
src/app/       pages, layouts, route handlers, global styles
src/agents/    question, evaluation, coach, and fallback modules
src/server/    LLM provider and benchmark services
src/lib/       resume, interview, storage, dataset, audio, auth, resources
src/components/ shared UI components
src/features/  landing and auth feature components
src/data/      interview and benchmark datasets
src/types/     shared contracts
tests/         automated behavior and contract tests
```

## Verification

Run:

```bash
npm test
```

The test suite exercises the resume pipeline, interview orchestration, evaluation contracts, score calibration, evidence faithfulness, fallback behavior, and storage compatibility. Provider-backed behavior still depends on the configured provider and network availability; deterministic fallback behavior is tested independently.

## Current limitations

- local authentication is not a production identity system;
- profiles and sessions are not cross-device;
- server profile/cache state is process-local;
- Web Speech API support varies by browser;
- plan progress updates roadmap/milestone state but does not yet maintain a durable learned-skills profile;
- repository naming contains legacy Cadence/ElevateAI references that can be standardized separately.
