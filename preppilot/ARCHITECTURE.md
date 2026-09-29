# AI Communication & Interview Coaching Platform — System Architecture

This document details the multi-agent architecture, data pipeline, Agent-to-Agent (A2A) communication schemas, design decisions, and trade-offs for the AI Communication & Interview Coaching application ("Cadence").

---

## Source Code Organization

The codebase follows a clear frontend, backend, agent, and domain boundary while preserving Next.js App Router conventions:

```
src/
├── app/                 # Next.js routes, layouts, and thin API route handlers
│   ├── api/             # HTTP transport only; delegates to server/domain modules
│   ├── app/             # Authenticated product pages
│   └── onboarding/      # Onboarding route pages
├── agents/              # Interview orchestration and specialist agent implementations
├── server/              # Server-only AI provider and benchmark services
│   ├── ai/
│   └── evaluation/
├── features/            # Feature-owned frontend UI and state
│   ├── auth/
│   └── landing/
├── components/          # Reusable, feature-agnostic UI components
├── lib/                 # Cross-cutting domain logic, browser adapters, and storage helpers
│   ├── interview/
│   ├── resume/
│   ├── dataset/
│   └── storage/
├── data/                # Versioned static datasets
└── types/               # Shared TypeScript contracts
```

### Dependency rules

- Pages and feature components may depend on `components`, `lib`, `data`, and `types`.
- API route handlers are the only HTTP boundary and delegate to `server`, `agents`, and domain logic.
- `server` modules own provider clients and server-side evaluation services; they must not be imported by browser UI.
- `agents` own interview decisions and specialist evaluation contracts; they do not own route or UI code.
- Shared contracts and static datasets never import from higher layers.

This prevents route files from becoming business-logic containers and keeps UI, transport, agent, and provider concerns independently testable.

---

## 1. High-Level Architecture & Data Processing Flow

The system orchestrates a five-specialist agent architecture designed for real-time interview practice, acoustic analysis, linguistic structure evaluation, and longitudinal improvement planning.

```
Candidate Resume (PDF / DOCX / Text)
   │
   ▼
┌──────────────────────────────────────────────┐
│       Resume Knowledge & Evidence Graph      │
│  - Extracts ventures, roles, facts, metrics  │
│  - Maps competencies & unassigned ownership  │
│  - Tracks topics covered vs topics remaining │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│     Resume-Driven AI Interviewer Agent       │
│  - Selects/generates tailored question       │
│  - Strictly grounds in verified resume facts │
│  - Evaluates previous answer gaps            │
│  - Decides follow-up vs new resume topic     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
         Personalized Interview Question
                       │
                       ▼
               Candidate Response
            (Voice STT or Typed Text)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│     Agent 2:     │       │     Agent 3:     │
│  Communication   │       │Content Evaluation│
│  Analysis Agent  │       │      Agent       │
│ - Clarity        │       │ - Relevance      │
│ - Conciseness    │       │ - Completeness   │
│ - Fillers/Hedges │       │ - Evidence & ROI │
│ - Speech Cadence │       │ - Tech Depth     │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         └─────────────┬────────────┘
                       ▼
       ┌──────────────────────────────┐
       │           Agent 4:           │
       │      STAR Structure Agent    │
       │ - Situation, Task, Action,   │
       │   Result decomposition       │
       │ - Grounded verbatim quotes   │
       └───────────────┬──────────────┘
                       │
                       ▼ A2A Handoff
       ┌──────────────────────────────┐
       │           Agent 5:           │
       │     Lead Interview Coach     │
       │ - Consolidates all 4 agents  │
       │ - Calculates weighted score  │
       │ - Writes improved model      │
       │   answer & hit points        │
       │ - Probes with adaptive       │
       │   follow-up questions        │
       └───────────────┬──────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ Coaching Report  │       │ Follow-Up Drills │
│ - Evidence quotes│       │ - Response-based │
│ - STAR status    │       │ - Targeted depth │
│ - A2A traces     │       │ - Instant replay │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         └─────────────┬────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│          Multi-Session Tracking Store        │
│  - Longitudinal recurring gap analysis       │
│  - Communication index & streak calculations │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│         Personalized Improvement Plan        │
│  - Milestone roadmaps based on real gaps     │
│  - Targeted exercises & prep library         │
└──────────────────────────────────────────────┘
```

---

## 2. The 5 Specialist Agents

### Agent 1 — Resume-Driven AI Interviewer (Primary Interview Engine)
* **Role**: Ingests the candidate's structured **Resume Knowledge Model** and **Resume Evidence Graph** alongside the active interview round (HR, Behavioral, Technical, Situational, Leadership, Mock), target role, and past answers.
* **Core Responsibilities**:
  - Grounds every question in factual resume claims (ventures, companies, projects, metrics, tools).
  - Eliminates hallucinations by strictly forbidding fabricated experience.
  - Dynamically decides between:
    - Asking an adaptive follow-up on a detected answer gap (e.g. unquantified metric, missing STAR result, weak ownership).
    - Exploring a deeper dimension of the same resume venture/project.
    - Moving to an uncovered resume item or competency.
    - Concluding the round and generating the comprehensive Debrief Report.
* **Input Schema**:
  ```json
  {
    "candidateName": "string",
    "targetRole": "string",
    "round": "hr | behavioral | technical | situational | leadership | mock",
    "difficulty": "Warm-up | Standard | Senior",
    "resumeKnowledge": {
      "candidate": { "name": "string", "summary": "string" },
      "experience": ["object"],
      "projects": ["object"],
      "skills": { "technical": ["string"], "technologies": ["string"] },
      "evidenceGraph": ["ResumeEvidenceItem"]
    },
    "history": ["InterviewTurnRecord"],
    "coreQuestionsAsked": "number",
    "totalCoreQuestions": "number",
    "currentFollowUpsForCore": "number",
    "topicsCovered": ["string"],
    "topicsRemaining": ["string"]
  }
  ```
* **Output Schema**:
  ```json
  {
    "question": "string",
    "questionType": "behavioral | technical | situational | leadership | hr | followup",
    "round": "string",
    "competency": "string",
    "difficulty": "string",
    "source": "resume",
    "resumeTopic": "ZAVE",
    "reason": "Explore ownership and operational adversity at ZAVE",
    "expectedCompetency": "STAR Rigor & Personal Ownership",
    "followUp": false,
    "evidenceUsed": ["ZAVE", "Co-founder", "120+ orders"],
    "isCompleted": false
  }
  ```

### Agent 2 — Communication Analysis Agent
* **Role**: Evaluates acoustic, lexical, and delivery mechanics: clarity, conciseness, verbal fillers (`um`, `uh`, `like`, `basically`), hedging language (`I guess`, `maybe`), sentence cadence, and rambling risk.
* **Output Schema**:
  ```json
  {
    "clarity": 82,
    "conciseness": 76,
    "communication_quality": 84,
    "filler_words": 1,
    "hedging": 1,
    "strengths": ["Clean sentence structure", "Minimal verbal hesitation"],
    "improvements": ["Trim concluding explanation to avoid trailing off"],
    "evidence": ["'In my view, we architected the microservice...'"],
    "filler_breakdown": { "um": 1 }
  }
  ```

### Agent 3 — Content Evaluation Agent
* **Role**: Determines whether the candidate actually answered the prompt, verified expected technical depth, cited concrete metrics and ROI, and provided grounded examples.
* **Output Schema**:
  ```json
  {
    "relevance": 88,
    "completeness": 80,
    "competency_match": 85,
    "strengths": ["Clear technical alignment with system scaling"],
    "gaps": ["Did not quantify the exact latency decrease"],
    "evidence": ["'We refactored the pipeline from batch to event-driven'"]
  }
  ```

### Agent 4 — STAR Structure Agent
* **Role**: Deconstructs behavioral and situational responses into **Situation**, **Task**, **Action**, and **Result**. Detects whether each component is present (`detected`), `weak`, or `missing`, with extracted quotes.
* **Output Schema**:
  ```json
  {
    "situation": { "status": "detected", "evidence": "During our Q3 migration..." },
    "task": { "status": "detected", "evidence": "I was tasked with maintaining zero downtime..." },
    "action": { "status": "detected", "evidence": "I designed blue-green deployment pipelines..." },
    "result": { "status": "detected", "evidence": "We achieved 99.99% uptime and zero dropped sessions..." },
    "starFilled": 4,
    "quantifiableResult": true
  }
  ```

### Agent 5 — Lead Interview Coach Agent
* **Role**: Master synthesizer. Ingests all 4 specialist outputs via A2A handoff, computes the weighted overall score, generates an improved rewrite demonstration, and crafts personalized follow-up probing questions.
* **Output Schema**:
  ```json
  {
    "overall": 84,
    "verdict": "Panel-ready — structured, specific and confident.",
    "strengths": ["..."],
    "improvements": ["..."],
    "modelAnswer": "...",
    "modelPoints": ["..."],
    "followUps": [
      "What specific metric improved the most as a result?",
      "How did you address edge cases during the migration?"
    ]
  }
  ```

---

## 3. Agent-to-Agent (A2A) Communication Protocol

All inter-agent communication follows an observable, structured messaging bus. Each transaction records:
* `from`: Source agent identifier
* `to`: Destination agent identifier
* `payload`: Structured JSON payload
* `timestamp`: Unix millisecond timestamp
* `status`: Delivery status (`delivered` | `processed`)
* `latencyMs`: Network / inference execution time

### Trace Topology
```
[Question Agent] ────► [Communication Agent] ────► [Coach Agent]
                 ────► [Content Agent]       ────► [Coach Agent]
                 ────► [STAR Agent]          ────► [Coach Agent]
```
These real message payloads are displayed in the **Agents Explorer** (`/app/agents`) and in the **A2A Trace Tab** in the **Practice Session** (`/app/session`), enabling transparent multi-agent observability.

---

## 4. Key Design Decisions & Trade-Offs

### 1. Multi-Agent Pipeline vs Monolithic Prompt
* **Decision**: Decomposed the evaluation into 5 specialist agents with dedicated prompts and schemas.
* **Rationale**: Single LLM prompts hallucinate scores, confuse acoustic pacing with conceptual depth, and fail to provide grounded quotes. Specialist agents yield modular, reproducible, and verifiable rubrics.
* **Trade-off**: Higher inference calls; mitigated through parallel asynchronous dispatch (`Promise.all`) for Communication, Content, and STAR agents.

### 2. Hybrid Rule + LLM Architecture with Zero-Failure Fallback
* **Decision**: Implemented an LLM provider abstraction (`LLMProvider`) supporting OpenAI GPT-4o, Anthropic/custom providers, and a high-fidelity deterministic offline engine.
* **Rationale**: Guarantees 100% demo uptime and continuous development capability even during API rate limits, expired keys, or offline presentations.

### 3. Client-Side Speech Recognition vs Server-Side Audio Streaming
* **Decision**: Leveraged the browser's native Web Speech API (`SpeechRecognition`) for real-time transcription with fallback to typed text input.
* **Rationale**: Eliminates server audio stream ingestion latency, lowers token costs by 95%, and delivers instant in-browser transcription.

### 4. Longitudinal Gap Aggregation in Persistent Storage
* **Decision**: Aggregated recurring gaps across all historical sessions in `cadence_sessions_v1` rather than isolated turn-by-turn evaluations.
* **Rationale**: Real coaching requires recognizing patterns (e.g. consistently missing the "Result" in STAR, or recurring filler words under pressure).

---

## 5. Dataset Integration & RecruitView Format

The system integrates a structured question bank adhering to the **RecruitView** schema:
* `id`: Unique question identifier (`q_swe_sys_01`)
* `question`: Authentic interview prompt text
* `role`: Target job role (`swe`, `sse`, `em`, `pm`, `da`, `sa`)
* `competency`: Interview dimension (`behavioral`, `tech-comm`, `problem`, `leadership`, `system-design`)
* `difficulty`: Seniority calibration (`Warm-up`, `Standard`, `Senior`)
* `questionType`: Category format (`Behavioral`, `Situational`, `Technical`, `STAR`, `Role Alignment`)
* `expectedCompetency`: Rubric target for the Content Agent
* `evaluationCriteria`: Specific checklist points evaluated by the Coach Agent

The dataset manager (`DatasetManager`) includes built-in methods for:
* Dynamic query filtering by role, competency, difficulty, and type
* Personalized ranking against candidate skills and projects
* Ingesting custom CSV and JSON datasets via `importFromJSON` and `importFromCSV`

---

## 6. The 6 Resume-Driven Interview Rounds & Decision Logic

### The 6 Supported Rounds
1. **Round 1 — HR & Introduction** (3 core questions, 0–1 follow-ups):
   - Background journey, career motivation, and direct alignment of resume achievements to the target role.
2. **Round 2 — Behavioral & STAR** (6 core questions, 1–2 follow-ups):
   - Probing challenges, overcoming failure, team disagreements, and ownership using actual past projects.
3. **Round 3 — Technical & Domain Knowledge** (6 core questions, 1–2 follow-ups):
   - Grounded in technologies, architecture, and libraries listed on the resume (e.g. FastAPI, Kafka, Vector DB, CLIP).
4. **Round 4 — Situational & Problem Solving** (5 core questions, 1–2 follow-ups):
   - Operational scenarios calibrated to the candidate's actual startup/enterprise experience (e.g. 30% order drop, dependency outage).
5. **Round 5 — Leadership & Ownership** (4 core questions, 1–2 follow-ups):
   - Extreme ownership, founder decisions, unassigned initiatives, and stakeholder influence.
6. **Round 6 — Full Comprehensive Mock** (15 core questions):
   - Rotates through: HR (2), Behavioral (4), Technical (4), Situational (2), Leadership (2), and Final Role Alignment (1).

### Next-Question Decision Engine
After every candidate answer, the AI Interviewer evaluates:
- **Decision A**: Ask an adaptive follow-up if an answer lacks metrics, exhibits weak personal ownership, or misses the STAR Result.
- **Decision B**: Deep-dive into trade-offs or technical decisions on the same resume venture.
- **Decision C**: Advance to an uncovered resume item in the evidence graph.
- **Decision D**: Pivot to a new competency focus.
- **Decision E**: Conclude the round and generate the Comprehensive Debrief Report.

### Zero-Hallucination Factual Grounding
The system explicitly distinguishes **Fact from Resume** vs **Inference**. If a resume states *"Co-founder at ZAVE, 120+ orders, ₹1L+ revenue"*, the interviewer grounds questions in those exact claims and metrics without fabricating team sizes, unmentioned technologies, or artificial roles.
