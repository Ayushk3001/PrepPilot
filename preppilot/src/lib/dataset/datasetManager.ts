import { ROLES, COMPETENCIES, DIFFICULTIES, QUESTION_TYPES } from '@/lib/mockData';
import { CandidateProfile } from '@/lib/api';

export interface StructuredQuestion {
  id: string;
  question: string;
  role: string; // 'swe' | 'sse' | 'em' | 'pm' | 'da' | 'cs'
  competency: string; // 'behavioral' | 'tech-comm' | 'problem' | 'customer' | 'leadership' | 'system-design'
  difficulty: 'Warm-up' | 'Standard' | 'Senior';
  questionType: 'Behavioral' | 'Situational' | 'Technical' | 'STAR' | 'Any';
  expectedCompetency: string;
  evaluationCriteria: string[];
  focus: string[];
  durationSec: number;
  expectSTAR: boolean;
  modelPoints: string[];
  modelAnswer: string;
  followUps: string[];
  context?: string;
}

export const QUESTION_DATASET: StructuredQuestion[] = [
  // 1. SWE / SSE Behavioral
  {
    id: "swe-beh-01",
    question: "Describe a challenging situation where you had a strong technical disagreement with a team member or architect. How did you resolve it?",
    role: "swe",
    competency: "behavioral",
    difficulty: "Standard",
    questionType: "Behavioral",
    expectedCompetency: "Conflict Resolution & Technical Alignment",
    evaluationCriteria: [
      "Sets clear context without blaming colleagues",
      "Demonstrates data-driven decision making (proofs-of-concept, benchmarks)",
      "Quantifiable outcome and team alignment"
    ],
    focus: ["Conflict resolution", "Data-driven decisions", "STAR delivery"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["State the architectural dispute clearly", "Use empirical benchmark data over opinions", "Acknowledge trade-offs respectfully", "Deliver measurable production outcome"],
    modelAnswer: "When redesigning our notification pipeline, a senior architect favored polling while I proposed Server-Sent Events. To resolve the impasse objectively, I built a 2-day prototype benchmarking memory and socket throughput under 10k connections. The benchmark showed SSE reduced server CPU by 58%. I presented the data collaboratively, addressed reconnection edge cases, and the team adopted the architecture on schedule.",
    followUps: [
      "If your benchmark had shown equal performance between polling and SSE, what secondary metric would have broken the tie?",
      "How did you address the architect's specific operational concerns regarding connection state?",
      "What was the quantifiable business impact of switching protocols?"
    ]
  },
  {
    id: "swe-beh-02",
    question: "Tell me about a high-severity production outage you caused or responded to. How did you diagnose, mitigate, and prevent recurrence?",
    role: "swe",
    competency: "behavioral",
    difficulty: "Standard",
    questionType: "STAR",
    expectedCompetency: "Incident Management & Blameless Post-Mortem",
    evaluationCriteria: [
      "Rapid triage and mitigation prioritization over root cause hunt during outage",
      "Effective stakeholder communication",
      "Systematic prevention through automated guardrails"
    ],
    focus: ["Incident triage", "Blameless post-mortem", "Automated prevention"],
    durationSec: 180,
    expectSTAR: true,
    modelPoints: ["Triage before debugging", "Communicate blast radius", "Implement automated CI/CD guardrail", "Measure Mean Time to Recovery (MTTR)"],
    modelAnswer: "During peak traffic, a bad database migration locked our accounts table, spiking API 500 errors to 14%. As primary on-call, I initiated the incident bridge, executed an immediate rolling rollback within 4 minutes, and restored traffic. During the blameless post-mortem, I traced the issue to an unindexed foreign key lock and added an automated linter in GitHub Actions that blocks non-concurrent index migrations.",
    followUps: [
      "What telemetry metric first alerted you to the migration deadlock?",
      "How did you manage customer-facing communication while rolling back?",
      "What safeguards were introduced to prevent similar migration locks?"
    ]
  },

  // 2. SSE System Design & Problem Solving
  {
    id: "sse-sys-01",
    question: "Walk me through how you would architect a real-time event streaming pipeline processing 100,000 events per second with exactly-once semantics.",
    role: "sse",
    competency: "problem",
    difficulty: "Senior",
    questionType: "Technical",
    expectedCompetency: "Distributed Systems & Streaming Architecture",
    evaluationCriteria: [
      "Partitioning strategy and consumer group scaling",
      "Idempotency keys and transactional outbox pattern for exactly-once processing",
      "Backpressure handling and dead-letter queues"
    ],
    focus: ["Kafka partitioning", "Idempotency keys", "Backpressure handling", "P99 latency"],
    durationSec: 180,
    expectSTAR: false,
    modelPoints: ["Partition keys based on business entity", "Transactional outbox or idempotent deduplication table", "Dead-letter queue with exponential backoff", "Metrics for consumer lag and p99 latency"],
    modelAnswer: "I would partition the ingestion layer on business entity IDs using Kafka to guarantee in-order delivery. To achieve end-to-end exactly-once semantics without two-phase commit overhead, each downstream worker enforces idempotent database writes using Redis bloom filters backed by a unique idempotency key table. We isolate slow consumers via dead-letter queues and auto-scale worker pools based on consumer lag telemetry.",
    followUps: [
      "How do you handle schema evolution across multiple independent microservices consuming that topic?",
      "What is your disaster recovery plan if the primary Kafka partition leader becomes network-partitioned?",
      "Why did you choose an idempotency table over distributed two-phase commit?"
    ]
  },
  {
    id: "sse-tech-01",
    question: "Explain a complex technical trade-off you made between eventual consistency and strong consistency in a critical customer workflow.",
    role: "sse",
    competency: "tech-comm",
    difficulty: "Senior",
    questionType: "Situational",
    expectedCompetency: "Technical Communication & Trade-off Articulation",
    evaluationCriteria: [
      "Clear explanation of why strict ACID transactions didn't scale",
      "Handling edge-case state synchronization and compensations (Saga pattern)",
      "Communicating user experience implications to non-technical partners"
    ],
    focus: ["CAP theorem trade-offs", "Saga orchestrator", "User experience resilience"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Define the business workflow", "Articulate why strong consistency bottlenecked throughput", "Explain compensating transactions", "Show impact on latency and reliability"],
    modelAnswer: "In our international checkout pipeline, locking inventory across distributed warehouses caused checkout latency to exceed 3.5 seconds. I led the transition to an eventual consistency model using an orchestrated Saga pattern: inventory is reserved optimistically with a 15-minute lease while payment settles asynchronously. If payment fails, a compensating event releases the lease. This cut checkout latency by 68% and lifted throughput 4x.",
    followUps: [
      "How did you handle the edge case where an optimistic lease expires while payment confirmation is delayed?",
      "How did you explain the eventual consistency delay to the customer support team?",
      "What telemetry alert informs you of stuck compensating transactions?"
    ]
  },

  // 3. Product Manager (PM)
  {
    id: "pm-prob-01",
    question: "How do you decide what NOT to build when engineering, sales, and executive leadership demand conflicting roadmap priorities?",
    role: "pm",
    competency: "problem",
    difficulty: "Senior",
    questionType: "Situational",
    expectedCompetency: "Product Prioritization & Executive Stakeholder Management",
    evaluationCriteria: [
      "Framework-driven prioritization (RICE, Cost of Delay, OKR alignment)",
      "Saying 'no' with empirical customer evidence and strategic focus",
      "Protecting engineering capacity from feature-creep"
    ],
    focus: ["RICE prioritization", "Strategic alignment", "Empirical customer research"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Anchor decisions to top quarterly business OKRs", "Apply a transparent scoring rubric like RICE", "Say no respectfully using user research and telemetry", "Communicate roadmap trade-offs transparently"],
    modelAnswer: "When sales requested bespoke one-off client integrations while engineering urged tech debt reduction, I anchored our sprint planning to our core OKR: 30-day user retention. I ran a RICE analysis scoring sales requests against our user churn data, proving that 42% of customer drop-offs were caused by API latency rather than missing features. By prioritizing the core performance upgrade, we defended our engineering team and reduced churn by 18%.",
    followUps: [
      "How did you keep the sales leadership motivated after declining their top enterprise feature request?",
      "What leading metric did you track weekly to validate that your prioritization decision was correct?",
      "How do you budget engineering capacity between product features and architectural maintenance?"
    ]
  },
  {
    id: "pm-beh-01",
    question: "Describe a product or feature launch that missed its expected KPIs. What did you learn and how did you pivot?",
    role: "pm",
    competency: "behavioral",
    difficulty: "Standard",
    questionType: "STAR",
    expectedCompetency: "Accountability, Post-Launch Discovery & Rapid Iteration",
    evaluationCriteria: [
      "Taking ownership of the shortfall rather than blaming engineering or marketing",
      "Conducting qualitative user interviews and funnel drop-off analysis",
      "Pivoting based on user feedback to drive adoption"
    ],
    focus: ["KPI accountability", "Funnel telemetry", "User discovery pivot"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Own the initial outcome", "Inspect the telemetry funnel", "Conduct rapid customer discovery interviews", "Ship iterative fix and measure turnaround"],
    modelAnswer: "We launched an automated AI workflow builder expecting 25% weekly active adoption, but week-one conversion stalled at 6%. Rather than assuming users didn't want the feature, I reviewed session replays and interviewed 10 drop-off candidates. We discovered users were intimidated by a blank canvas. Within 2 weeks, we shipped 3 pre-built workflow templates and an interactive onboarding preview. Adoption surged to 31% over the following month.",
    followUps: [
      "What was the specific friction point users mentioned during discovery?",
      "How did you prioritize the quick-win templates against scheduled roadmap commitments?",
      "What guardrails do you now use to test onboarding before public release?"
    ]
  },

  // 4. Engineering Manager (EM)
  {
    id: "em-lead-01",
    question: "How do you manage an underperforming senior engineer who writes brilliant code but refuses to communicate or mentor juniors?",
    role: "em",
    competency: "leadership",
    difficulty: "Senior",
    questionType: "Situational",
    expectedCompetency: "Performance Coaching & Engineering Culture",
    evaluationCriteria: [
      "Separating individual technical output from team multiplier expectations",
      "Clear, actionable feedback delivered in 1-on-1s",
      "Structuring growth milestones that reward mentorship and collaboration"
    ],
    focus: ["Senior expectations", "Constructive feedback", "Team multiplier mindset"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Clarify the engineering ladder criteria for senior roles", "Hold compassionate but firm private 1-on-1s", "Pair them on specific high-leverage mentorship projects", "Track behavioral progress alongside code output"],
    modelAnswer: "I had a senior engineer whose code velocity was top-tier, but junior PRs sat unreviewed for days and team morale suffered. In our 1-on-1, I affirmed his technical excellence but walked through our career matrix: senior engineers are evaluated as team force-multipliers. I tasked him with co-leading our architectural RFC reviews and pairing with a junior on our GraphQL migration. Within two quarters, his PR review turnaround dropped to under 4 hours and the junior engineer was promoted.",
    followUps: [
      "How would you handle it if the engineer pushed back and stated they only wanted to write code?",
      "How did you ensure the junior engineer felt supported during the initial pairing sessions?",
      "What objective metrics did you use to evaluate improvement in collaboration?"
    ]
  },
  {
    id: "em-lead-02",
    question: "Walk me through how you cultivate psychological safety on a team while maintaining unrelenting standards of engineering rigor.",
    role: "em",
    competency: "leadership",
    difficulty: "Senior",
    questionType: "Behavioral",
    expectedCompetency: "High-Performance Culture & Blameless Accountability",
    evaluationCriteria: [
      "Normalizing admitting mistakes and proposing risky ideas without fear",
      "Decoupling rigorous code review standards from personal criticism",
      "Celebration of shared learning and post-mortems"
    ],
    focus: ["Psychological safety", "Engineering rigor", "Blameless post-mortems"],
    durationSec: 150,
    expectSTAR: false,
    modelPoints: ["Model vulnerability as the leader", "Institute objective automated testing and code standards", "Champion blameless post-mortems", "Encourage dissenting technical opinions"],
    modelAnswer: "Psychological safety and high standards are not mutually exclusive—high standards require psychological safety so engineers dare to report risks early. I model this by openly sharing my own misjudgments, establishing blameless post-mortems focused strictly on system vulnerabilities, and using automated linters and CI benchmarks so code reviews focus on architecture rather than stylistic nitpicks.",
    followUps: [
      "Give an example of a time an engineer publicly challenged your decision and how you responded.",
      "How do you address an engineer who consistently delivers late while maintaining team trust?",
      "What signals tell you that psychological safety is deteriorating on your team?"
    ]
  },

  // 5. Data Analyst (DA)
  {
    id: "da-prob-01",
    question: "You run an A/B test on a key user funnel. The test shows a statistically significant 5% lift in conversion, but average revenue per user dropped 8%. How do you diagnose and recommend next steps?",
    role: "da",
    competency: "problem",
    difficulty: "Standard",
    questionType: "Technical",
    expectedCompetency: "Cohort Segmentation, Metric Cannibalization & Statistical Rigor",
    evaluationCriteria: [
      "Identifying Simpson's paradox or cannibalization of high-tier plans",
      "Segmenting metrics by user cohort, geography, and traffic acquisition channel",
      "Providing a nuanced business recommendation instead of just declaring a winner"
    ],
    focus: ["A/B testing", "Cohort segmentation", "Metric cannibalization", "Executive readout"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Segment conversion by pricing tier", "Examine Sample Ratio Mismatch (SRM) and statistical power", "Check cohort lifetime value projections", "Synthesize findings into executive trade-offs"],
    modelAnswer: "A conversion lift paired with revenue decline indicates either cannibalization or a mix shift. I segmented the test variant by pricing tier and acquisition channel, discovering the new checkout flow made our discounted basic tier 40% more prominent, cannibalizing enterprise sign-ups. I presented this trade-off to leadership with lifetime value projections and recommended iterating the design to preserve premium tier visibility before rollout.",
    followUps: [
      "How do you test for Sample Ratio Mismatch (SRM) before interpreting test results?",
      "What minimum sample size and runtime guardrails do you enforce to avoid day-of-week bias?",
      "How would you visualize this trade-off for a C-suite executive?"
    ]
  },

  // 6. Solutions Architect / Customer Facing (CS / SA)
  {
    id: "cs-cust-01",
    question: "A high-value enterprise client is threatening to churn because our cloud platform experienced three intermittent API timeouts during their peak Black Friday hours. How do you lead the recovery meeting?",
    role: "cs",
    competency: "customer",
    difficulty: "Senior",
    questionType: "Situational",
    expectedCompetency: "Executive De-escalation & Technical Root Cause Defense",
    evaluationCriteria: [
      "Demonstrating empathy and acknowledging client business impact without defensiveness",
      "Presenting a transparent technical timeline and root-cause analysis",
      "Offering concrete contractual SLAs and architectural remediation milestones"
    ],
    focus: ["Executive de-escalation", "RCA transparency", "SLA commitments"],
    durationSec: 150,
    expectSTAR: true,
    modelPoints: ["Open with empathy and acknowledge lost revenue", "Present a clean timeline of the root cause", "Walk through concrete architectural remedies", "Provide continuous executive telemetry access"],
    modelAnswer: "I opened the meeting by acknowledging their operational stress: 'You trusted us with your biggest revenue weekend and we let you down.' I presented a transparent timeline showing how a database connection pool exhaustion triggered the timeouts. Rather than vague apologies, I walked them through our immediate 3-tier remediation: dedicated database read-replicas, rate-limiting guards, and an automated failover cluster, followed by a contractual SLA credit and dedicated war-room access.",
    followUps: [
      "How did you align your engineering team to deliver the fixes within the promised timeframe?",
      "If the client's CTO demanded financial penalties beyond the SLA agreement, how would you negotiate?",
      "What communication cadences did you establish during the subsequent remediation weeks?"
    ]
  },

  // 7. Warm-up & Introductory Questions
  {
    id: "warmup-01",
    question: "Tell me about yourself, your technical trajectory, and what brings you to this interview today.",
    role: "swe",
    competency: "behavioral",
    difficulty: "Warm-up",
    questionType: "Behavioral",
    expectedCompetency: "Elevator Pitch & Concise Self-Introduction",
    evaluationCriteria: [
      "Logical chronology: Past foundation, Present ownership, Future aspiration",
      "Highlights technical depth without getting bogged down in minutiae",
      "High energy and natural confidence"
    ],
    focus: ["Past, Present, Future", "Technical identity", "Clear delivery"],
    durationSec: 120,
    expectSTAR: false,
    modelPoints: ["State your core engineering specialization", "Highlight 1-2 major technical achievements with numbers", "Explain alignment with this specific opportunity"],
    modelAnswer: "I am a Software Engineer with 3 years of experience specializing in distributed TypeScript services and event-driven architectures. In my recent work, I spearheaded the migration of our transaction engine to Apache Kafka, cutting p99 latency by 45%. I'm passionate about building resilient systems at scale, and I'm excited by this role's focus on high-throughput platform architecture.",
    followUps: [
      "What technical challenge in that Kafka migration are you most proud of solving?",
      "What kind of engineering culture brings out your best work?",
      "Where do you see your technical trajectory growing over the next two years?"
    ]
  }
];

export class DatasetManager {
  private questions: StructuredQuestion[] = [...QUESTION_DATASET];

  constructor(customQuestions?: StructuredQuestion[]) {
    if (customQuestions && customQuestions.length > 0) {
      this.questions = customQuestions;
    }
  }

  public getAllQuestions(): StructuredQuestion[] {
    return this.questions;
  }

  public filterQuestions(params: {
    role?: string;
    competency?: string;
    difficulty?: string;
    questionType?: string;
  }): StructuredQuestion[] {
    return this.questions.filter(q => {
      if (params.role && params.role !== 'Any' && q.role !== params.role && q.role !== 'swe') {
        // Allow fallback to generic swe if specific role isn't populated
        if (q.role !== params.role) return false;
      }
      if (params.competency && params.competency !== 'All' && params.competency !== 'Any') {
        if (q.competency !== params.competency) return false;
      }
      if (params.difficulty && params.difficulty !== 'Any') {
        if (q.difficulty.toLowerCase() !== params.difficulty.toLowerCase()) return false;
      }
      if (params.questionType && params.questionType !== 'Any') {
        if (q.questionType.toLowerCase() !== params.questionType.toLowerCase()) return false;
      }
      return true;
    });
  }

  public selectPersonalizedQuestion(
    profile: CandidateProfile | null,
    params: {
      role?: string;
      competency?: string;
      difficulty?: string;
      type?: string;
      previousQuestionIds?: string[];
    }
  ): StructuredQuestion {
    const candidateSkills = (profile?.technical_skills || []).map(s => s.toLowerCase());
    const candidateProjects = (profile?.projects || []).map(p => p.name.toLowerCase() + ' ' + (p.summary || '').toLowerCase());
    const candidateDomains = (profile?.domains || []).map(d => d.toLowerCase());

    const matches = this.filterQuestions({
      role: params.role,
      competency: params.competency,
      difficulty: params.difficulty,
      questionType: params.type,
    });

    const candidates = matches.length > 0 ? matches : this.questions;
    const prevIds = new Set(params.previousQuestionIds || []);
    const unasked = candidates.filter(q => !prevIds.has(q.id));
    const pool = unasked.length > 0 ? unasked : candidates;

    // Score based on profile relevance
    let bestQuestion = pool[0];
    let highestScore = -1;

    for (const q of pool) {
      let score = 0;
      const qText = (q.question + ' ' + q.focus.join(' ')).toLowerCase();

      // Check skills match
      for (const skill of candidateSkills) {
        if (qText.includes(skill)) score += 3;
      }

      // Check domain match
      for (const domain of candidateDomains) {
        if (qText.includes(domain)) score += 4;
      }

      // Check projects match
      for (const proj of candidateProjects) {
        if (qText.includes('project') || qText.includes('challenging') || qText.includes('scale')) {
          score += 2;
        }
      }

      // Check role exact match
      if (params.role && q.role === params.role) score += 5;

      if (score > highestScore) {
        highestScore = score;
        bestQuestion = q;
      }
    }

    return bestQuestion;
  }

  public importFromJSON(jsonString: string): { importedCount: number; errors: string[] } {
    const errors: string[] = [];
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { importedCount: 0, errors: ["Root must be an array of questions"] };
      }

      let count = 0;
      parsed.forEach((item, idx) => {
        if (!item.id || !item.question) {
          errors.push(`Row ${idx}: missing required fields 'id' or 'question'`);
          return;
        }
        this.questions.push({
          id: String(item.id),
          question: String(item.question),
          role: String(item.role || 'swe'),
          competency: String(item.competency || 'behavioral'),
          difficulty: (item.difficulty || 'Standard') as any,
          questionType: (item.questionType || 'Behavioral') as any,
          expectedCompetency: String(item.expectedCompetency || item.competency || 'Core Competency'),
          evaluationCriteria: Array.isArray(item.evaluationCriteria) ? item.evaluationCriteria : ['Clarity', 'Relevance'],
          focus: Array.isArray(item.focus) ? item.focus : ['STAR', 'Communication'],
          durationSec: Number(item.durationSec) || 150,
          expectSTAR: Boolean(item.expectSTAR ?? true),
          modelPoints: Array.isArray(item.modelPoints) ? item.modelPoints : [],
          modelAnswer: String(item.modelAnswer || ''),
          followUps: Array.isArray(item.followUps) ? item.followUps : []
        });
        count++;
      });

      return { importedCount: count, errors };
    } catch (e: any) {
      return { importedCount: 0, errors: [e.message] };
    }
  }

  public importFromCSV(csvString: string): { importedCount: number; errors: string[] } {
    const lines = csvString.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return { importedCount: 0, errors: ["CSV file is empty or missing headers"] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    const qIdx = headers.indexOf('question');
    const roleIdx = headers.indexOf('role');
    const compIdx = headers.indexOf('competency');

    if (qIdx === -1) {
      return { importedCount: 0, errors: ["CSV must contain a 'question' column"] };
    }

    let count = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length <= qIdx) continue;

      const qText = parts[qIdx];
      const qId = idIdx !== -1 && parts[idIdx] ? parts[idIdx] : `csv_${Date.now()}_${i}`;
      const qRole = roleIdx !== -1 && parts[roleIdx] ? parts[roleIdx] : 'swe';
      const qComp = compIdx !== -1 && parts[compIdx] ? parts[compIdx] : 'behavioral';

      this.questions.push({
        id: qId,
        question: qText,
        role: qRole,
        competency: qComp,
        difficulty: 'Standard',
        questionType: 'Behavioral',
        expectedCompetency: qComp,
        evaluationCriteria: ['Clarity', 'Relevance', 'Structure'],
        focus: ['STAR', 'Communication'],
        durationSec: 150,
        expectSTAR: true,
        modelPoints: ['State clear situation', 'Show action', 'Quantify result'],
        modelAnswer: '',
        followUps: ['Can you expand on the quantifiable results of that initiative?']
      });
      count++;
    }

    return { importedCount: count, errors };
  }
}

export const defaultDatasetManager = new DatasetManager();
