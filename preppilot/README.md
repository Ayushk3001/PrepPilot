# Cadence — AI-Powered Multi-Agent Communication & Interview Coaching System

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Capstone-Full%20PRD%20Compliance-emerald)](#)

> **Cadence** is an enterprise AI communication and interview coaching platform designed to elevate candidate verbal communication, structured reasoning (STAR methodology), technical accuracy, and executive presence. Built on an observable 5-specialist agent architecture with real-time speech transcription, structured Agent-to-Agent (A2A) handoffs, longitudinal gap tracking, and an automated LLM-as-a-judge benchmark suite.

Source-code boundaries and dependency rules are documented in [ARCHITECTURE.md](./ARCHITECTURE.md#source-code-organization).

---

## 🌟 Architecture & Data Processing Pipeline

```
Candidate Profile
   │ (Skills, Projects, Target Role, Experience)
   ▼
┌──────────────────────────────────────────────┐
│       Agent 1: Interview Question Agent      │
│  - Understands candidate profile & role      │
│  - Selects/generates calibrated question     │
│  - Establishes rubric criteria & STAR target │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
               Interview Question
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

## 🛠️ Tech Stack & Key Technologies

- **Framework**: Next.js 16 (Turbopack, App Router, React 19)
- **Language**: TypeScript 5 (Strict Typing)
- **Styling**: Vanilla CSS & TailwindCSS v4 with dedicated tokens (`terra`, `paper`, `coal`, `sage`, `ochre`)
- **Typography**: Editorial fonts (`Newsreader`, `Fraunces`, `DM Sans`, `JetBrains Mono`)
- **Animations**: Framer Motion & CSS micro-animations
- **Speech Recognition**: In-browser Web Speech API (`SpeechRecognition`) with voice waveform telemetry
- **Multi-Agent Pipeline**: Distributed 5-agent pipeline with observable A2A messaging bus
- **LLM Provider Abstraction**: Pluggable provider system (OpenAI GPT-4o, Custom Providers, Deterministic Zero-Failure Engine)
- **Persistence**: Structured local storage with session history, longitudinal trends, and profile persistence

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node.js v20+)
- npm or pnpm

### 1. Installation
```bash
git clone <repo-url>
cd Capstone
npm install
```

### 2. Environment Configuration
The system is pre-configured with the project's OpenAI-compatible endpoint. Values are saved in `.env.local`:
```env
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_MODEL=your-model-name
LANGSMITH_API_KEY=
LANGSMITH_TRACING=false
LANGSMITH_PROJECT=cadence
```

To run a streaming test from the shell:
```bash
node scripts/test_llm.mjs
```
Or in Python:
```bash
python3 scripts/test_llm.py
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 📂 Complete Application Routes

| Route | View Description |
| :--- | :--- |
| `/` | Editorial landing page with hero, interactive demo, agent showcase, bento grid, and testimonials |
| `/signup` | User authentication registration flow |
| `/login` | Candidate sign-in flow |
| `/onboarding/resume` | 4-stage animated resume ingestion pipeline (`Uploading` → `Reading` → `Extracting` → `Profile`) |
| `/onboarding/profile` | 10-section Candidate AI Profile editor with skills, projects, certifications, and target roles |
| `/app` | Main dashboard displaying candidate index, weekly goals, radar breakdown, and quick practice CTA |
| `/app/practice` | Practice Arena with target role selection, competency focus, difficulty, and preset profiles |
| `/app/session` | Live Interview Session supporting voice/text responses, 5-agent evaluation, STAR breakdown, Coach rewrite, follow-up drilling, and **real A2A message traces** |
| `/app/sessions` | Multi-session history with search, competency filters, transcript review, and score distributions |
| `/app/plan` | Personalized Improvement Plan generated from recurring gaps across multiple sessions |
| `/app/agents` | Technical demonstration explorer showing agent schemas, interactive pipeline debugger, live A2A message payloads, and LLM-as-a-judge benchmark runner |

---

## 🤖 The 5 Specialist Autonomous Agents

1. **Interview Question Agent**:
   - Analyzes candidate profile (skills, projects, experience) and target role.
   - Selects or synthesizes calibrated questions preventing repetitive drills.
   - Defines expected competency and evaluation criteria.
2. **Communication Analysis Agent**:
   - Measures clarity, conciseness, verbal fillers (`um`, `uh`, `like`), hedging, and sentence cadence.
   - Generates structured JSON with grounded evidence quotes.
3. **Content Evaluation Agent**:
   - Determines whether the response answered the question asked.
   - Assesses technical depth, completeness, and quantified metric citations.
4. **STAR Response Structure Agent**:
   - Deconstructs behavioral and situational answers into Situation, Task, Action, and Result.
   - Categorizes each component as `detected`, `weak`, or `missing` with verbatim evidence.
5. **Lead Interview Coach Agent**:
   - Consolidates all specialist outputs via A2A handoff into unified coaching.
   - Delivers overall score, verdict, strengths, actionable improvements, an improved model rewrite, and response-dependent follow-up questions.

---

## 📡 Agent-to-Agent (A2A) Communication Trace

Inter-agent transactions are logged with timestamps, sender, receiver, execution latency, and full structured JSON payloads:
```json
{
  "from": "comm_agent",
  "to": "coach_agent",
  "payload": {
    "clarity": 85,
    "conciseness": 78,
    "filler_words": 1,
    "hedging": 0,
    "strengths": ["Clear signposting and direct opening"],
    "improvements": ["Elaborate on the quantified impact of the solution"],
    "evidence": ["'I identified that our ingestion throughput was bottlenecked...'"]
  },
  "timestamp": 1727438400000,
  "status": "delivered",
  "latencyMs": 14
}
```
View live A2A traces in `/app/session` (A2A Trace tab) and `/app/agents` (Live A2A Message Payloads).

---

## 📊 RecruitView Dataset Integration

The platform includes an extensible question management system formatted to the **RecruitView** dataset specification:
```typescript
interface StructuredQuestion {
  id: string;
  question: string;
  role: 'swe' | 'sse' | 'em' | 'pm' | 'da' | 'sa';
  competency: 'behavioral' | 'tech-comm' | 'problem' | 'leadership' | 'system-design';
  difficulty: 'Warm-up' | 'Standard' | 'Senior';
  questionType: 'Behavioral' | 'Situational' | 'Technical' | 'STAR' | 'Role Alignment';
  expectedCompetency: string;
  evaluationCriteria: string[];
  focus?: string[];
  modelAnswer?: string;
  durationSec?: number;
}
```

### Dataset Import API
Programmatically import custom questions via JSON or CSV:
```typescript
import { defaultDatasetManager } from "@/lib/dataset/datasetManager";

// Import JSON
defaultDatasetManager.importFromJSON(customJsonString);

// Import CSV
defaultDatasetManager.importFromCSV(csvString);
```

---

## 🎯 8-Minute Project Presentation Guide

| Time Window | Segment | Key Demo Actions |
| :--- | :--- | :--- |
| **0:00 - 1:30** | **Executive Overview & Problem** | Showcase landing page (`/`). Explain why static flashcards fail and how Cadence's 5-agent pipeline solves this. |
| **1:30 - 3:00** | **Profile & Question Selection** | Open Candidate Profile (`/onboarding/profile`). Navigate to Practice Arena (`/app/practice`), select role and competency. Show how the Question Agent personalizes the prompt. |
| **3:00 - 5:00** | **Live Practice Session & Voice STT** | Speak or type a response. Run the 5-Agent Pipeline. Watch the live stepper progress through all 5 agents. |
| **5:00 - 6:30** | **Evidence-Based Coaching & A2A Trace** | Show the ScoreRing, STAR breakdown with verbatim quotes, and Coach's rewritten model answer. Open the **A2A Trace Tab** to prove real structured data exchange between agents. |
| **6:30 - 7:30** | **Recurring Gaps & Improvement Plan** | Visit `/app/plan` and `/app/sessions`. Show how multi-session data aggregates recurring patterns (e.g. unquantified results) into personalized milestone drills. |
| **7:30 - 8:00** | **Agents Explorer & Benchmark Suite** | Visit `/app/agents`. Run the Live Pipeline Debugger and execute the LLM-as-a-judge Benchmark Suite. |

---

## 🧪 Comprehensive PRD Compliance Matrix

| Requirement | PRD Status | Implementation Evidence |
| :--- | :--- | :--- |
| **Candidate Profile** | ✅ Complete | 10-section profile persisted in storage with skills, projects, and target role (`/onboarding/profile`) |
| **Role-based Questions** | ✅ Complete | Filterable across Software Engineer, Senior SWE, EM, PM, Data Analyst, Solutions Architect |
| **Competency Focus** | ✅ Complete | Behavioral, Tech-Comm, Problem Solving, Leadership, System Design |
| **Difficulty Calibration**| ✅ Complete | Warm-up, Standard, and Senior tiers |
| **Text Response** | ✅ Complete | Real-time textarea input with word count and filler counter |
| **Voice Response** | ✅ Complete | Web Speech API STT with live listening toggle and audio state |
| **Interview Question Agent**| ✅ Complete | `InterviewQuestionAgent.execute()` personalizes questions from candidate profile |
| **Communication Analysis Agent**| ✅ Complete | `CommunicationAnalysisAgent.execute()` evaluates clarity, conciseness, fillers, and hedges |
| **Content Evaluation Agent** | ✅ Complete | `ContentEvaluationAgent.execute()` verifies relevance, completeness, and evidence |
| **STAR Structure Agent** | ✅ Complete | `StarStructureAgent.execute()` deconstructs S-T-A-R with verbatim evidence |
| **Interview Coach Agent** | ✅ Complete | `InterviewCoachAgent.execute()` consolidates all agents, generates rewrite and follow-ups |
| **Agent Handoff & A2A** | ✅ Complete | Observable A2A pipeline with message logs, timestamps, and payloads in `/app/session` and `/app/agents` |
| **Personalized Follow-Ups**| ✅ Complete | Adaptive follow-ups generated from detected gaps in candidate's response |
| **Recurring Gaps** | ✅ Complete | Multi-session historical aggregation in `store.ts` calculating percentage occurrences |
| **Improvement Plan** | ✅ Complete | Dynamic milestone roadmap based on actual gap keys (`/app/plan`) |
| **Evaluation Framework** | ✅ Complete | LLM-as-a-judge benchmark runner with 5 standardized test cases (`/app/agents`) |
| **Dataset Support** | ✅ Complete | RecruitView schema dataset manager with JSON/CSV import pipelines |
| **Zero-Failure Fallback**| ✅ Complete | Clean provider abstraction with deterministic rule engine guarantee |
