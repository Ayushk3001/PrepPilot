# Preppilot Design and Architecture Notes

This document records the design system and implementation decisions visible in the current codebase. It is a companion to [ARCHITECTURE.md](./ARCHITECTURE.md), which focuses on runtime data flow and boundaries.

## Product identity

The repository package is `preppilot`. The UI and older source strings still contain Cadence/ElevateAI naming in places, so naming is not yet completely standardized. The product experience is an interview-practice workspace centered on resume-grounded questions, typed or spoken answers, evidence-based feedback, session history, recurring-gap analysis, and a practice plan.

## User journey

```text
Landing
  → local signup/login
  → resume upload or profile editing
  → practice setup
  → live interview session
  → answer feedback and adaptive follow-up
  → saved session history
  → improvement plan and assessment
```

| Route | Current responsibility |
|---|---|
| `/` | Landing page and product explanation |
| `/signup`, `/login` | Browser-local account flow |
| `/onboarding/resume` | Upload, extraction status, parser diagnostics |
| `/onboarding/profile` | Review/edit canonical candidate profile |
| `/app` | Dashboard, score trends, goals and recent activity |
| `/app/practice` | Role, competency, difficulty and round setup |
| `/app/session` | Interview loop, response input, feedback and traces |
| `/app/sessions` | Searchable session history and score details |
| `/app/plan` | Recurring gaps, roadmap, resources and MCQ assessment |
| Landing agent sections and shared components | Agent/pipeline explanation in the landing experience |

## Visual design language

The UI uses a deliberately editorial, high-contrast visual language:

- warm paper/off-white surfaces;
- near-black ink and strong borders;
- terracotta, sage, ochre, and lavender accents;
- oversized display typography paired with compact sans-serif utility text;
- rectangular cards, score rings, metric panels, and dense dashboard layouts;
- motion for onboarding transitions, stepper progress, and panel reveals;
- responsive layouts implemented with CSS and Tailwind utility classes.

Global styling lives in `src/app/globals.css`. Components use Tailwind CSS v4 utilities plus project-specific CSS tokens. Framer Motion is used for selected UI transitions; it is not part of the server architecture.

## UI composition

```text
App layout
├─ global styles and metadata
├─ auth context/providers
├─ landing feature components
└─ authenticated app layout
   ├─ dashboard
   ├─ practice setup
   ├─ session workspace
   │  ├─ question/answer panel
   │  ├─ speech/transcription controls
   │  ├─ agent stepper
   │  ├─ score and STAR feedback
   │  └─ trace/pipeline details
   ├─ session history
   └─ improvement plan
```

Shared visual components are in `src/components`. Feature-owned components are in `src/features`. The largest interaction surfaces remain page-owned because they coordinate browser state, route calls, and presentation state together.

## Design contracts

### Candidate profile

`CandidateProfile` in `src/lib/api.ts` is the compatibility boundary between onboarding, browser storage, question generation, and evaluation. Its canonical fields are:

```text
basics, education, workExperience, internships, projects,
technicalSkills, softSkills, technologies, certifications,
achievements, domains
```

Legacy aliases such as `name`, `experience`, and `technical_skills` remain for compatibility with older UI and agent code.

### Interview state

`InterviewSessionState` includes round configuration, question counters, timing, history, resume knowledge, evidence coverage, and completion state. `InterviewController` is the policy boundary for time and question limits.

### Evaluation output

`CoachingFeedback` is the stable output consumed by the session UI and persistence layer. It contains scores, verdict, strengths, improvement areas, STAR breakdown, content evaluation, communication evaluation, rewrite guidance, model answer, adaptive follow-up, evidence, and recurring gaps.

Structured provider output is accepted only after parsing, contract validation, and faithfulness checks.

## Important implementation decisions

### Browser-first storage

The current product uses browser storage for a low-friction working prototype: profiles, local accounts, active sessions, completed sessions, roadmap caches, and milestone state are kept in the browser. This makes the demo usable without a database, but it is not cross-device or multi-user durable storage.

### Server-side provider boundary

LLM credentials are used by server-side modules and route handlers. `src/server/ai/llmClient.ts` normalizes OpenAI-compatible provider calls, response shapes, timeouts, retries, model selection, and safe diagnostics.

### Deterministic fallback

The product remains usable without a provider. Resume parsing, question generation, communication analysis, content analysis, STAR analysis, coaching, and roadmap generation each have deterministic or curated fallback behavior. This is a reliability feature, not a claim that every result is equivalent to an LLM result.

### Parallel evaluation

Communication, content, and STAR analysis are independent for a given answer, so the orchestrator dispatches them with `Promise.all`. The coach runs after those results are available. This reduces evaluation latency while preserving a single final feedback contract.

### Grounded coaching

The evaluator tracks candidate-answer evidence and the resume evidence graph. Faithfulness validation removes unsupported metrics, technologies, ownership claims, and other invented facts from final coaching output.

### Curated learning resources

The resource library is a static catalog. `recommendedTopics()` maps score weaknesses and recurring gaps to resource topics; the plan UI can supplement deterministic roadmap generation with an LLM-generated roadmap and milestone questions.

## Testing and quality model

The repository uses Node’s test runner through `tsx`:

```bash
npm test
```

Tests cover resume parsing and normalization, question generation, interview limits and graph behavior, evaluation contracts, calibration, faithfulness, fallback behavior, persistence compatibility, and active evaluation behavior.

The benchmark route provides a product-level benchmark suite using static test cases. It measures relevance, analysis quality, evidence groundedness, usefulness, consistency, latency, and pass/warning status. It should be read as an application benchmark, not as an independent scientific evaluation framework.

## Operational boundaries

The application currently has no database, background worker, object storage, message broker, server authentication provider, or server-side audio ingestion. Deployment is therefore a single Next.js deployment with environment variables for the OpenAI-compatible provider.

If the project becomes multi-user and production-durable, the first architectural additions should be server identity, a database-backed profile/session model, durable resume storage, and server-side authorization around every route. Those are future changes, not current components.
