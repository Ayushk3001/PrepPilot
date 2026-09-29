// @ts-nocheck
export const ROLES = [
  { id: "aiml", label: "AI / ML Engineer", tag: "AI · Applied Systems" },
  { id: "swe", label: "Software Engineer", tag: "IC · Engineering" },
  { id: "sse", label: "Senior Software Engineer", tag: "IC · Engineering" },
  { id: "pm", label: "Product Manager", tag: "Product" },
  { id: "da", label: "Data Analyst", tag: "Analytics" },
  { id: "ba", label: "Business Analyst", tag: "Consulting" },
  { id: "devops", label: "Cloud / DevOps Engineer", tag: "Infrastructure" },
  { id: "em", label: "Engineering Manager", tag: "Leadership" },
  { id: "cs", label: "Customer Success Manager", tag: "Client-Facing" },
];

export const COMPETENCIES = [
  { id: "behavioral", label: "Behavioral" },
  { id: "tech-comm", label: "Technical Communication" },
  { id: "problem", label: "Problem Solving" },
  { id: "leadership", label: "Leadership" },
  { id: "customer", label: "Customer Obsession" },
];

export const DIFFICULTIES = ["Warm-up", "Standard", "Senior", "Executive"];

export const QUESTION_TYPES = ["Introductory", "Behavioral", "Situational", "Technical", "Motivational"];

export const EVAL_CRITERIA = [
  { key: "relevance", label: "Relevance", weight: 20 },
  { key: "clarity", label: "Clarity", weight: 20 },
  { key: "structure", label: "Response Structure", weight: 25 },
  { key: "completeness", label: "Completeness", weight: 20 },
  { key: "communication", label: "Communication Quality", weight: 15 },
];

export const AGENTS = [
  {
    id: "question",
    name: "Interview Question Agent",
    short: "Question Agent",
    tag: "Contextual Adaptive",
    desc: "Selects and adapts questions from the bank using your target role, competency focus, difficulty ladder and past weak spots.",
    prompt:
      "You are the Interview Question Agent. Given a candidate profile {target_role, skills, experience_level, past_gaps} and the question bank index, select or generate ONE question that maximizes signal on the target competency. Output strict JSON: {question_id, text, competency, difficulty, type, focus_tags[], expected_duration_sec}.",
  },
  {
    id: "comm",
    name: "Communication Analysis Agent",
    short: "Communication Agent",
    tag: "Speech Intelligence",
    desc: "Evaluates clarity, pacing, filler words, sentence length and vocal confidence signals from the transcript or live audio.",
    prompt:
      "You are the Communication Analysis Agent. Receive transcript + prosody features {wpm, filler_count, avg_sentence_len, hedge_count, pause_ratio}. Score clarity and communication_quality 0-100. Output strict JSON: {clarity, communication, filler_words[], long_sentences[], notes[]}.",
  },
  {
    id: "content",
    name: "Content Evaluation Agent",
    short: "Content Agent",
    tag: "Domain Depth",
    desc: "Checks whether the response actually answers the question, and scores relevance, domain accuracy and completeness against the expected competency.",
    prompt:
      "You are the Content Evaluation Agent. Given the question, its expected key points, and the candidate response, score relevance and completeness 0-100. Cite exact evidence spans. Output strict JSON: {relevance, completeness, covered_points[], missed_points[], evidence[]}.",
  },
  {
    id: "star",
    name: "STAR & Structure Agent",
    short: "STAR Agent",
    tag: "Behavioral Logic",
    desc: "Deconstructs behavioral answers into Situation, Task, Action, Result — flags missing pieces and weak quantification.",
    prompt:
      "You are the STAR & Response Structure Agent. Parse the response into {situation, task, action, result}, detect each component with evidence spans, and flag structural gaps (missing result, unquantified impact, no framing). Output strict JSON: {star:{situation:{detected,evidence},...}, structure_score, gaps[]}.",
  },
  {
    id: "coach",
    name: "Interview Coach Agent",
    short: "Coach Agent",
    tag: "Synthesis",
    desc: "Consolidates every specialist signal into one verdict: overall score, strengths, prioritized improvements, a rewritten model answer and follow-up drills.",
    prompt:
      "You are the Interview Coach Agent. Synthesize outputs from the Communication, Content and STAR agents. Produce a coaching verdict: {overall, strengths[], improvements[], improved_answer, follow_ups[], coach_note}. Be specific, cite evidence, never invent facts.",
  },
];

export const QUESTION_BANK = [
  {
    id: "q1",
    text: "Tell me about yourself.",
    type: "Introductory",
    competency: "behavioral",
    difficulty: "Warm-up",
    roles: ["swe", "sse", "pm", "da", "ba", "devops", "em", "cs"],
    durationSec: 120,
    focus: ["Present framing", "Career arc", "Role fit"],
    expectSTAR: false,
    modelPoints: [
      "Open with your current role and a one-line scope statement",
      "Connect two past experiences to the target role",
      "Close with why this specific opportunity fits",
    ],
    modelAnswer:
      "I'm a software engineer with four years building customer-facing platforms. Most recently I led the migration of our checkout service, cutting p95 latency 40% and lifting conversion 6%. Before that I shipped our internal design system used by five teams. I'm now looking to bring that mix of hands-on delivery and cross-team influence to a senior role — which is exactly why this position stood out.",
    followUps: [
      "Which of those projects are you proudest of, and why?",
      "How does your experience map to our stack specifically?",
      "Where do you want to be two roles from now?",
    ],
  },
  {
    id: "q2",
    text: "Why are you interested in this role?",
    type: "Motivational",
    competency: "behavioral",
    difficulty: "Warm-up",
    roles: ["swe", "sse", "pm", "da", "ba", "devops", "em", "cs"],
    durationSec: 90,
    focus: ["Specificity", "Company research", "Motivation"],
    expectSTAR: false,
    modelPoints: [
      "Name something specific about the company or team",
      "Tie your skills to the actual responsibilities",
      "State what you want to learn or own next",
    ],
    modelAnswer:
      "Two reasons. First, the role combines platform engineering with customer exposure — my checkout migration taught me I do my best work when I can talk directly to the people affected. Second, your team is scaling from 6 to 15 engineers, and growing tooling and review culture at that stage is exactly the challenge I want next.",
    followUps: [
      "What did you learn about how our team works?",
      "What would make you regret taking this role?",
      "What's the first thing you'd want to own?",
    ],
  },
  {
    id: "q3",
    text: "Describe a challenging project you worked on. What made it hard, and what was the outcome?",
    type: "Behavioral",
    competency: "behavioral",
    difficulty: "Standard",
    roles: ["swe", "sse", "pm", "da", "devops", "ba"],
    durationSec: 180,
    focus: ["STAR structure", "Ownership", "Quantified result"],
    expectSTAR: true,
    modelPoints: [
      "Frame the situation and why it was genuinely hard",
      "Make your specific actions the center of the story",
      "Quantify the result and one lesson learned",
    ],
    modelAnswer:
      "Our order pipeline was dropping 2% of payments during peak traffic. I owned the diagnosis: tracing showed a race between retries and idempotency keys. I redesigned the key scheme, staged a shadow rollout, and added automated reconciliation. Failures dropped to 0.1% within a month, and the reconciliation tooling became the team's standard for every money-path change.",
    followUps: [
      "What was your specific contribution versus the team's?",
      "What would you do differently if it happened again?",
      "How did you keep stakeholders informed during it?",
    ],
  },
  {
    id: "q4",
    text: "How would you handle a difficult customer or stakeholder who is unhappy with your delivery?",
    type: "Situational",
    competency: "customer",
    difficulty: "Standard",
    roles: ["pm", "cs", "ba", "sse", "em"],
    durationSec: 150,
    focus: ["Empathy first", "De-escalation", "Concrete steps"],
    expectSTAR: true,
    modelPoints: [
      "Listen and acknowledge before defending",
      "Separate the emotion from the solvable issue",
      "Commit to a concrete corrective plan with dates",
    ],
    modelAnswer:
      "First I'd get on a call and listen without defending — usually the anger is about missed expectations, not the defect itself. I'd restate their concern to confirm I understood, then separate what went wrong from what can still be fixed. Last time this happened, I committed to a fix in five working days with a daily written update, and the stakeholder became one of the project's strongest supporters.",
    followUps: [
      "What if their demand is genuinely unreasonable?",
      "When have you had to say no to a customer?",
      "How do you prevent the situation from repeating?",
    ],
  },
  {
    id: "q5",
    text: "Explain a complex technical concept from your work to a non-technical audience.",
    type: "Technical",
    competency: "tech-comm",
    difficulty: "Standard",
    roles: ["swe", "sse", "da", "devops", "pm"],
    durationSec: 150,
    focus: ["Plain language", "Analogy", "Audience check"],
    expectSTAR: false,
    modelPoints: [
      "Choose a relatable analogy before any jargon",
      "Layer detail progressively, check for understanding",
      "Land on why it matters for the business",
    ],
    modelAnswer:
      "Explaining idempotency to our support team, I used a coffee analogy: if the barista can't tell whether you already paid, they might charge you twice. Our payment system adds a unique receipt to every order so retries never double-charge. I checked understanding by asking them to spot the failure case — and then explained why that receipt is also why refunds are safe.",
    followUps: [
      "How would you adjust that explanation for an executive?",
      "When has a miscommunication about a technical topic cost you?",
      "How do you confirm the audience actually followed you?",
    ],
  },
  {
    id: "q6",
    text: "Walk me through how you would approach diagnosing a critical production outage under pressure.",
    type: "Situational",
    competency: "problem",
    difficulty: "Senior",
    roles: ["swe", "sse", "devops", "em"],
    durationSec: 180,
    focus: ["Systematic method", "Prioritization", "Communication cadence"],
    expectSTAR: false,
    modelPoints: [
      "Stabilize first: mitigate impact before root-causing",
      "Narrow the blast radius with a systematic method",
      "Keep a fixed communication cadence with stakeholders",
    ],
    modelAnswer:
      "Mitigate before root-cause: if the last deploy correlates, roll back first and debug offline. I'd check the blast radius — which services, which customers — then binary-search the dependency chain using metrics and traces. During the incident I run a fixed cadence: status update every 15 minutes in the incident channel, so nobody has to ask. Post-incident, a blameless review with one owner per action item.",
    followUps: [
      "How do you decide between rollback and a hotfix?",
      "What goes into your post-incident review?",
      "How do you keep the on-caller from burning out mid-incident?",
    ],
  },
  {
    id: "q7",
    text: "Describe a time you disagreed with your manager or a senior stakeholder. What did you do?",
    type: "Behavioral",
    competency: "leadership",
    difficulty: "Senior",
    roles: ["sse", "pm", "em", "ba"],
    durationSec: 180,
    focus: ["Respectful challenge", "Data over ego", "Commit decision"],
    expectSTAR: true,
    modelPoints: [
      "Present the disagreement respectfully and privately",
      "Bring evidence or a small experiment, not just opinion",
      "Disagree and commit once the call is made",
    ],
    modelAnswer:
      "My manager wanted to ship a feature by cutting the analytics layer. I believed we'd lose the ability to prove its value later, so I brought usage data from a similar cut we'd made before and proposed a two-week thinner alternative. He held his timeline, but agreed to instrument a minimal event set — which ended up justifying the full layer next quarter. I committed fully to his version in the meantime.",
    followUps: [
      "What if the data had supported your manager instead?",
      "How do you disagree when you don't have data?",
      "Has there been a time you were wrong to push back?",
    ],
  },
  {
    id: "q8",
    text: "Tell me about a decision you made with incomplete information. How did you manage the risk?",
    type: "Behavioral",
    competency: "problem",
    difficulty: "Senior",
    roles: ["sse", "pm", "em", "devops", "da"],
    durationSec: 150,
    focus: ["Risk framing", "Reversibility", "Decision hygiene"],
    expectSTAR: true,
    modelPoints: [
      "Define what was unknown and the cost of waiting",
      "Choose reversible over irreversible where possible",
      "Set a checkpoint to revisit the decision",
    ],
    modelAnswer:
      "We had to pick a streaming platform before our vendor contract lapsed — full load-testing wasn't possible in time. I framed the unknowns as two risks: throughput and ops burden. Since migration was reversible, I chose the option with cheaper rollback, set a two-week checkpoint with clear kill metrics, and documented the trigger for switching back. We never needed it, but the checkpoint made it a safe bet.",
    followUps: [
      "What was the cost of being wrong, concretely?",
      "When is a 55% confidence level enough to act?",
      "How do you explain that risk trade-off to leadership?",
    ],
  },
  {
    id: "q9",
    text: "How do you prioritize when everything on your plate is urgent?",
    type: "Situational",
    competency: "leadership",
    difficulty: "Standard",
    roles: ["pm", "sse", "ba", "cs", "em"],
    durationSec: 120,
    focus: ["Framework", "Saying no", "Stakeholder alignment"],
    expectSTAR: false,
    modelPoints: [
      "Use an explicit framework, not gut feel",
      "Make trade-offs visible to stakeholders",
      "Protect at least one slot for deep work",
    ],
    modelAnswer:
      "I sort by impact times reversibility: what breaks customers, what breaks deadlines, what only breaks my calendar. Then I make the trade-off visible — I'll send a two-line note saying what I'm dropping and by when it'll be picked back up, so stakeholders can renegotiate rather than discover. Anything deep gets one protected morning block; urgent work expands to fill every gap you give it.",
    followUps: [
      "Give an example where you dropped the wrong thing.",
      "How do you handle a stakeholder who escalates over your call?",
      "What's your framework for saying no politely?",
    ],
  },
  {
    id: "q10",
    text: "Tell me about a time you failed. What changed in how you work afterwards?",
    type: "Behavioral",
    competency: "behavioral",
    difficulty: "Standard",
    roles: ["swe", "sse", "pm", "da", "devops", "cs", "em"],
    durationSec: 150,
    focus: ["Real ownership", "Learning", "Behavior change"],
    expectSTAR: true,
    modelPoints: [
      "Pick a real failure — no humble-brags",
      "Own your part without blaming others",
      "Show the specific habit that changed",
    ],
    modelAnswer:
      "I shipped a schema migration without a rollback plan because the staging run was clean — production data volume changed the plan shape, and it locked tables for 20 minutes. My part: I treated a green staging run as proof instead of a signal. Since then, every migration I write includes a measured rollback step, and I got the team to add it to our definition of done.",
    followUps: [
      "Who else was affected by that failure?",
      "How quickly did you surface it to your team?",
      "What would signal you're regressing to old habits?",
    ],
  },
  {
    id: "q11",
    text: "Convince me in two minutes that you're the right fit for this team.",
    type: "Motivational",
    competency: "behavioral",
    difficulty: "Executive",
    roles: ["sse", "pm", "em", "cs"],
    durationSec: 120,
    focus: ["Executive presence", "Positioning", "Confidence"],
    expectSTAR: false,
    modelPoints: [
      "Lead with your single strongest proof point",
      "Match your strengths to the team's actual gap",
      "Close with a confident, specific first-90-days",
    ],
    modelAnswer:
      "You need someone who can ship reliability work while the team doubles — I've done exactly that. I led our checkout hardening: 40% lower p95 latency, 0.1% payment failures, and two engineers I mentored now own the service. In my first ninety days here I'd pick the highest-churn system, stabilize it, and make its dashboards the template for everyone else.",
    followUps: [
      "What's the weakest part of your candidacy?",
      "What would your last manager say I should worry about?",
      "Where do you NOT want to be in three years?",
    ],
  },
  {
    id: "q12",
    text: "Explain the trade-offs between SQL and NoSQL databases for a scaling product.",
    type: "Technical",
    competency: "tech-comm",
    difficulty: "Standard",
    roles: ["swe", "sse", "da", "devops"],
    durationSec: 150,
    focus: ["Structured comparison", "Trade-offs", "Concrete example"],
    expectSTAR: false,
    modelPoints: [
      "Structure the comparison around workload, not preference",
      "Cover consistency, scale and query flexibility",
      "Anchor it in a concrete decision you've made",
    ],
    modelAnswer:
      "I frame it around the workload's shape. SQL buys you relational integrity and flexible ad-hoc queries — right for orders and billing. NoSQL buys horizontal write scale and schema flexibility — right for event streams and catalogs. On our telemetry pipeline we chose a document store for write throughput and accepted eventual consistency; for payments we stayed relational because a JOIN bug is cheaper than a reconciliation mess.",
    followUps: [
      "When have you seen a NoSQL choice regretted?",
      "How does eventual consistency affect product features?",
      "What would make you migrate between the two?",
    ],
  },
  {
    id: "q13",
    text: "How would you measure the success of a new feature after launch?",
    type: "Technical",
    competency: "tech-comm",
    difficulty: "Standard",
    roles: ["pm", "da", "ba"],
    durationSec: 150,
    focus: ["Metric hierarchy", "Guardrails", "Timeframes"],
    expectSTAR: false,
    modelPoints: [
      "Tie success metric to the problem the feature solves",
      "Include adoption, depth and guardrail metrics",
      "Set explicit timeframes and review checkpoints",
    ],
    modelAnswer:
      "Start from the problem: if the feature shortens onboarding, success is time-to-first-value, not logins. I'd track one north-star adoption metric, a depth metric showing real usage, and guardrails like support tickets or churn. Then set review points — 7 days for adoption signal, 30 days for retention — and pre-agree what result would make us iterate, revert, or double down.",
    followUps: [
      "What if adoption is high but retention is flat?",
      "How do you handle a metric that moves for unrelated reasons?",
      "Which metric would you personally check first?",
    ],
  },
  {
    id: "q14",
    text: "A launch is slipping but the date is fixed by marketing. What do you cut and how do you decide?",
    type: "Situational",
    competency: "leadership",
    difficulty: "Executive",
    roles: ["pm", "em", "sse"],
    durationSec: 150,
    focus: ["Scope surgery", "Stakeholder trust", "Decision speed"],
    expectSTAR: false,
    modelPoints: [
      "Protect the core promise, cut the polish",
      "Make the cut criteria explicit and shared",
      "Communicate the decision with a recovery plan",
    ],
    modelAnswer:
      "First I'd define the single promise the launch makes — if the date is fixed, scope is the only lever. I'd cut in this order: nice-to-have surfaces, then edge-case coverage behind flags, never the core flow or observability. I'd take the cut list to marketing and engineering leads the same day with what slips to fast-follow, because a scope cut nobody re-confirms becomes a trust leak later.",
    followUps: [
      "What if engineering says even the core won't make it?",
      "How do you prevent a 'fixed date' from becoming a habit?",
      "When would you go back and fight for the date to move?",
    ],
  },
  {
    id: "q15",
    text: "Describe your process for turning ambiguous requirements into an executable plan.",
    type: "Situational",
    competency: "problem",
    difficulty: "Standard",
    roles: ["pm", "ba", "sse", "da"],
    durationSec: 150,
    focus: ["Clarifying questions", "Assumption surfacing", "Milestones"],
    expectSTAR: false,
    modelPoints: [
      "Restate the goal and success criteria first",
      "Surface assumptions and rank them by risk",
      "Slice into milestones with a feedback checkpoint",
    ],
    modelAnswer:
      "I start by restating the goal in one sentence and getting a yes — half of ambiguity dies there. Then I list my assumptions ranked by risk and book thirty minutes with the requester to kill the top three. From what's left I slice a plan into milestones where the first one produces user-visible feedback within two weeks, because a plan that can't be corrected isn't a plan, it's a guess.",
    followUps: [
      "What do you do when the requester is unavailable?",
      "How detailed does a plan need to be before you start?",
      "Tell me about a plan you had to throw away.",
    ],
  },
  {
    id: "q16",
    text: "Tell me about a time you turned an unhappy customer into an advocate.",
    type: "Behavioral",
    competency: "customer",
    difficulty: "Standard",
    roles: ["cs", "pm", "ba"],
    durationSec: 150,
    focus: ["Ownership", "Empathy", "Measurable turnaround"],
    expectSTAR: true,
    modelPoints: [
      "Show how you heard the frustration early",
      "Fix the root cause, not just the ticket",
      "Prove the turnaround with a concrete signal",
    ],
    modelAnswer:
      "A customer sent a two-page complaint about our reporting latency — they were about to churn. I called them, let them walk me through their workflow, and found the real issue was a Monday-morning batch job colliding with their weekly review. We reprioritized the batch schedule and I sent them a personal update every week until it shipped. Three months later they were presenting our dashboards to their own executives as the fix they were proudest of.",
    followUps: [
      "What did the escalation cost you personally?",
      "How do you find unhappy customers who don't complain?",
      "What's your rule for when to escalate a customer issue?",
    ],
  },
];

export const MARQUEE_ITEMS = [
  "Product Management",
  "Senior Frontend Engineer",
  "Cloud Systems Architect",
  "Engineering Director",
  "Data Analyst",
  "Customer Success Lead",
  "Business Analyst",
  "DevOps Engineer",
];

export const FLOW_STEPS = [
  { label: "Candidate", note: "Profile, target role, skills" },
  { label: "Question", note: "Adaptive selection" },
  { label: "Response", note: "Text or voice" },
  { label: "Analysis", note: "Speech + content signals" },
  { label: "Specialist Agents", note: "4 parallel evaluators" },
  { label: "Coaching Feedback", note: "Coach synthesis" },
  { label: "Improvement Plan", note: "Cross-session" },
];

export const questionById = (id) => QUESTION_BANK.find((q) => q.id === id);

export function pickQuestion({ role, competency, difficulty, type }) {
  const pool = QUESTION_BANK.filter(
    (q) =>
      (!role || q.roles.includes(role)) &&
      (!competency || q.competency === competency) &&
      (!difficulty || q.difficulty === difficulty || difficulty === "Any") &&
      (!type || q.type === type || type === "Any")
  );
  const fallback = QUESTION_BANK.filter((q) => !role || q.roles.includes(role));
  const finalPool = pool.length ? pool : fallback.length ? fallback : QUESTION_BANK;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}
