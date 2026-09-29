import { InterviewQuestion } from '@/types/interview';

export const INITIAL_INTERVIEW_DATASET: InterviewQuestion[] = [
  // ==========================================
  // STAGE 1: HR & CULTURE SCREENING
  // ==========================================
  {
    id: 'hr-001',
    role: 'Fullstack Software Engineer',
    stage: 'HR & Culture Screening',
    competency: 'Self-Awareness & Professional Trajectory',
    difficulty: 'Mid-Level',
    questionType: 'HR / Cultural Fit',
    question: 'Tell me about yourself, your technical journey, and what drives you as an engineer.',
    expectedCompetencies: [
      'Concise narrative structuring (Past, Present, Future)',
      'Highlighting technical strengths without rambling',
      'Articulating personal motivation and alignment with engineering impact'
    ],
    evaluationCriteria: [
      'Presents a logical 90-120 second chronological journey',
      'Focuses on engineering achievements, tech stack choices, and project ownership',
      'Clarity of speech and absence of excessive filler words'
    ],
    idealStarResponse: 'I am a Fullstack Engineer with 3 years of experience specializing in distributed TypeScript microservices and responsive React systems. In my current role, I led the modernization of our billing workflow, reducing API response times by 35%. I am driven by building resilient, low-latency applications that directly solve end-user bottlenecks. I am excited to apply this ownership at scale with Prodapt.',
    weakResponseExample: 'Well, I was born in Delhi and I went to college there, then I did some Java, then I tried Python. I like computers and I have done some coding. In my free time I play video games.'
  },
  {
    id: 'hr-002',
    role: 'Telecom & Network Systems Engineer',
    stage: 'HR & Culture Screening',
    competency: 'Domain Alignment & Prodapt Fit',
    difficulty: 'Mid-Level',
    questionType: 'HR / Cultural Fit',
    question: 'Why are you specifically interested in telecom digital transformation and joining Prodapt?',
    expectedCompetencies: [
      'Understanding of Prodapt’s core focus (Connectedness, DSPs, OSS/BSS, 5G)',
      'Clear career alignment with telecom cloud and network automation',
      'Value contribution mindset'
    ],
    evaluationCriteria: [
      'Directly references Prodapt domain excellence in telecom & DSP transformation',
      'Shows enthusiasm for network virtualization, OSS/BSS modernization, or 5G core',
      'Professional tone and tailored ambition'
    ],
    idealStarResponse: 'Prodapt is recognized globally as the leading domain specialist in Connectedness and DSP transformation. Having worked on telecom provisioning automation and network telemetry, I have seen how legacy OSS/BSS bottlenecks slow down 5G rollouts. Joining Prodapt allows me to work at the intersection of network automation and cloud infrastructure to deliver carrier-grade solutions to global telcos.',
    weakResponseExample: 'I need a job and Prodapt is a big company with good salary and work from home options. My friend referred me.'
  },

  // ==========================================
  // STAGE 2: BEHAVIORAL & STAR COMPETENCY
  // ==========================================
  {
    id: 'beh-001',
    role: 'Fullstack Software Engineer',
    stage: 'Behavioral & STAR Competency',
    competency: 'Conflict Resolution & Stakeholder Alignment',
    difficulty: 'Mid-Level',
    questionType: 'Behavioral',
    question: 'Describe a challenging situation where you had a strong technical disagreement with a team member or architect. How did you resolve it?',
    expectedCompetencies: [
      'STAR methodology compliance',
      'Objective decision-making using data and benchmarks rather than ego',
      'Empathy and team cohesion'
    ],
    evaluationCriteria: [
      'Clearly sets the Situation and Task (specific architectural dispute)',
      'Details concrete Actions taken (benchmarking, spike tests, RFC discussions)',
      'Provides a quantifiable Result (delivery outcome, performance gain, team consensus)'
    ],
    idealStarResponse: 'Situation: During the redesign of our real-time notification engine, a senior architect favored maintaining our legacy polling system while I proposed switching to Server-Sent Events (SSE). Task: I needed to resolve the deadlock without stalling the sprint deadline. Action: I built a quick 2-day proof-of-concept benchmark measuring server memory, TCP socket utilization, and throughput under 10,000 concurrent mock connections. The data demonstrated that SSE reduced server load by 58%. I scheduled a collaborative review, presented the empirical results respectfully, and addressed his failover concerns by adding reconnect logic. Result: The team adopted the SSE architecture, the feature shipped on schedule, and we eliminated $1,200/month in idle polling cloud costs.',
    weakResponseExample: 'I argued with him because my idea was newer. Eventually the manager told him to let me do it and it worked out fine.'
  },
  {
    id: 'beh-002',
    role: 'Cloud & DevOps Engineer',
    stage: 'Behavioral & STAR Competency',
    competency: 'Incident Management & Accountability',
    difficulty: 'Senior',
    questionType: 'Behavioral',
    question: 'Tell me about a high-severity production outage or failure you were responsible for or responded to. What was your remediation and long-term fix?',
    expectedCompetencies: [
      'STAR framework with blameless post-mortem accountability',
      'Systematic root cause analysis (RCA)',
      'Preventative engineering practices (chaos engineering, runbooks, canary gates)'
    ],
    evaluationCriteria: [
      'Explains Situation with incident severity (P1/P0) and user impact',
      'Details Task of incident commander/responder',
      'Details Actions: triage, rollback, mitigation, RCA',
      'Quantifies Result: MTTR reduction, zero recurrence, automated guardrails'
    ],
    idealStarResponse: 'Situation: On a Friday evening, a database migration in our production Kubernetes cluster locked the central accounts table, causing a 504 gateway timeout spike for 22,000 active users. Task: As on-call lead, I had to restore availability within our 15-minute SLA while safeguarding data integrity. Action: I immediately declared a P1 incident, initiated an automated Blue/Green rollback to the stable release, and temporarily scaled read-replicas. Within 9 minutes, availability returned to 99.98%. Over the following week, I conducted a blameless post-mortem, identified that an unindexed foreign key lock was the culprit, and implemented a mandatory CI pipeline pre-check that blocks migrations requiring exclusive table locks. Result: MTTR was kept to 9 minutes, zero transactions were lost, and no table-lock incident has recurred in 18 months.',
    weakResponseExample: 'The server went down and people were panicking. I restarted the pods and it started working again. We told customers it was a network issue.'
  },

  // ==========================================
  // STAGE 3: TECHNICAL & DOMAIN DEPTH
  // ==========================================
  {
    id: 'tech-001',
    role: 'Telecom & Network Systems Engineer',
    stage: 'Technical & Domain Depth',
    competency: 'OSS/BSS Architecture & 5G Service Orchestration',
    difficulty: 'Senior',
    questionType: 'Technical',
    question: 'How does modern OSS/BSS architecture decouple service order management from network provisioning in a cloud-native 5G standalone (SA) environment?',
    expectedCompetencies: [
      'Understanding of TMF Open Digital Architecture (ODA) and Open APIs (e.g. TMF622, TMF641)',
      'Service Orchestration (NFV-MANO, Kubernetes CNFs, Network Slicing)',
      'Event-driven asynchronous decoupling (Kafka, gRPC, microservices)'
    ],
    evaluationCriteria: [
      'Explains separation between Customer Facing Services (CFS) and Resource Facing Services (RFS)',
      'Mentions standard TMF APIs or cloud-native orchestration protocols',
      'Addresses network slicing lifecycle management (CSMF, NSMF, NSSMF)'
    ],
    idealStarResponse: 'In modern cloud-native 5G standalone architectures, decoupling is achieved by implementing TM Forum Open Digital Architecture (ODA) standards. BSS captures commercial intent via TMF622 Product Order API and maps it into Customer Facing Services (CFS). The Service Order Management (SOM) layer then translates CFS into Resource Facing Services (RFS) using TMF641 Service Ordering. Crucially, the SOM communicates asynchronously with the Network Resource Orchestrator via an event-driven Kafka bus. This isolates business logic from underlying network controllers (NSMF/NSSMF) and NFV-MANO orchestration. As a result, network slicing and containerized network functions (CNFs) can scale and heal dynamically on Kubernetes without blocking or modifying front-end billing and CRM workflows.',
    weakResponseExample: 'OSS and BSS connect to each other. When an order is placed, it calls an API and configures the 5G tower or router. Then it sends a confirmation back to the customer.'
  },
  {
    id: 'tech-002',
    role: 'Fullstack Software Engineer',
    stage: 'Technical & Domain Depth',
    competency: 'Distributed State & Concurrency Control',
    difficulty: 'Senior',
    questionType: 'Technical',
    question: 'In a microservices architecture, how do you handle distributed transactions and maintain eventual consistency without locking the entire database?',
    expectedCompetencies: [
      'Saga Pattern (Choreography vs Orchestration)',
      'Two-Phase Commit (2PC) trade-offs and CAP theorem',
      'Outbox pattern, idempotency keys, and compensation transactions'
    ],
    evaluationCriteria: [
      'Contrasts 2PC with Saga patterns accurately',
      'Details idempotency mechanisms and compensation actions',
      'Mentions transactional outbox pattern to ensure at-least-once delivery'
    ],
    idealStarResponse: 'Rather than using distributed two-phase commit (2PC) which introduces blocking locks and severe latency bottlenecks under high throughput, we implement the Saga pattern. For complex workflows, I favor Orchestrated Sagas using a dedicated state machine like Temporal or an event coordinator. Each microservice executes its local transaction and publishes an event using the Transactional Outbox Pattern to guarantee message emission with zero dual-write vulnerabilities. If a downstream service fails—for example, inventory reservation rejects an order—the orchestrator executes compensating transactions in reverse order to revert state. Every consumer endpoint enforces idempotency keys using Redis locks to safely handle retried events.',
    weakResponseExample: 'You can use SQL transactions with commit and rollback. If something fails, you just catch the error and do a rollback so everything stays consistent.'
  },
  {
    id: 'tech-003',
    role: 'AI & Data Platform Engineer',
    stage: 'Technical & Domain Depth',
    competency: 'LLM Orchestration & RAG Reliability',
    difficulty: 'Mid-Level',
    questionType: 'Technical',
    question: 'When building an enterprise Retrieval-Augmented Generation (RAG) system, what strategies do you employ to minimize hallucinations and optimize retrieval precision?',
    expectedCompetencies: [
      'Chunking strategies and hybrid search (Dense embeddings + BM25 keyword search)',
      'Reranking models (e.g. Cohere Rerank, Cross-Encoders)',
      'Groundedness checks, citation verification, and hallucination guardrails'
    ],
    evaluationCriteria: [
      'Distinguishes semantic vector search from lexical keyword search',
      'Explains re-ranking and contextual compression',
      'Explains post-generation validation or LLM-as-a-judge guardrails'
    ],
    idealStarResponse: 'To prevent hallucinations and optimize precision, I build a multi-stage retrieval pipeline. First, document chunking is tuned hierarchically with 10-15% token overlaps. For retrieval, I implement hybrid search combining dense semantic vectors (e.g. text-embedding-3) with sparse BM25 lexical search via Reciprocal Rank Fusion (RRF). Second, the top 25 retrieved candidates are passed to a Cross-Encoder Reranker to filter out semantically adjacent but irrelevant contexts, narrowing down to the top 4 most pertinent chunks. Finally, the LLM prompt enforces strict system instructions to cite exact chunk IDs, and a lightweight secondary judge model validates that every factual claim in the response is directly supported by the context before returning to the user.',
    weakResponseExample: 'I put the PDF into ChromaDB and query it with OpenAI embeddings. If it hallucinates, I increase the temperature or tell the prompt not to lie.'
  },

  // ==========================================
  // STAGE 4: SYSTEM DESIGN & SCENARIOS
  // ==========================================
  {
    id: 'des-001',
    role: 'Telecom & Network Systems Engineer',
    stage: 'System Design & Scenarios',
    competency: 'High-Throughput Telecom Telemetry Ingestion',
    difficulty: 'Lead / Principal',
    questionType: 'Scenario-Based',
    question: 'Design a carrier-grade telemetry ingestion platform that ingests 500,000 metrics per second from edge cell sites, detects network anomalies in under 3 seconds, and stores historical trends for 1 year.',
    expectedCompetencies: [
      'Capacity estimation and back-of-the-envelope calculations',
      'Stream processing architecture (Kafka/Pulsar, Apache Flink, ClickHouse/TimescaleDB)',
      'Tiered storage (Hot/Warm/Cold) and anomaly detection sliding windows'
    ],
    evaluationCriteria: [
      'Structures answer systematically: Functional/Non-functional, High-level, Deep dives, Failure modes',
      'Calculates network/storage throughput realistically',
      'Explains low-latency stream processing with sliding windows'
    ],
    idealStarResponse: 'I approach this design across four architectural tiers: Ingestion, Stream Processing, Tiered Storage, and Alerting. At 500k metrics/sec averaging 200 bytes each, we have 100 MB/sec ingestion throughput. Edge agents stream gRPC telemetry into geographically distributed API gateways backed by an Apache Kafka cluster partitioned by cell site ID. For real-time anomaly detection under 3 seconds, an Apache Flink stream analytics cluster computes tumbling and sliding 30-second windows measuring packet drop, latency spikes, and signal-to-noise ratios using dynamic Z-score thresholds. Alerts are dispatched to PagerDuty/Kafka within 1.2 seconds. For storage, we implement tiered retention: Hot data (last 7 days) in ClickHouse for sub-second sub-sampling queries, Warm data (30 days) compressed on SSDs, and Cold aggregations downsampled to 5-minute averages stored in S3 Glacier with Parquet formatting for year-long compliance reporting.',
    weakResponseExample: 'We can build an API with Node.js and save all metrics into MongoDB. Then run a cron job every minute to check if the network has any errors.'
  },

  // ==========================================
  // STAGE 5: EXECUTIVE & CLIENT COMMUNICATION
  // ==========================================
  {
    id: 'exec-001',
    role: 'Fullstack Software Engineer',
    stage: 'Executive & Client Communication',
    competency: 'Simplifying Complex Technical Architecture',
    difficulty: 'Senior',
    questionType: 'Scenario-Based',
    question: 'How would you explain the business value and risks of migrating from a monolithic legacy system to microservices to a non-technical C-level telecom client?',
    expectedCompetencies: [
      'Avoiding unnecessary technical jargon and acronyms',
      'Using real-world metaphors (e.g. single cargo ship vs fleet of agile speedboats)',
      'Focusing on business KPIs: Time-to-Market, Downtime blast radius, ROI, and Operational complexity'
    ],
    evaluationCriteria: [
      'Balances pros (independent team velocity, localized failure) with real risks (network overhead, coordination costs)',
      'Clear, persuasive, and empathetic executive presence',
      'Focuses on bottom-line business outcomes'
    ],
    idealStarResponse: 'I explain this through the analogy of an orchestra versus a team of agile solo performers. In your current monolithic system, the entire enterprise is like a single giant locomotive: if one small component, such as the billing module, breaks on a Friday night, the entire train stops, and every customer experiences downtime. Upgrading any feature requires testing and redeploying the entire train, which is why your release cycles take 6 weeks. Transitioning to microservices breaks that train into specialized, independent delivery vehicles. If one vehicle requires maintenance, your customer portal, streaming services, and voice networks stay running smoothly. Your teams can launch new promotional campaigns in 2 days instead of 6 weeks. However, I emphasize transparency on the trade-offs: managing a fleet of vehicles requires automated highways—investments in automated testing, monitoring, and disciplined governance. We make this transition incrementally via the Strangler pattern so your day-to-day revenue operations never pause.',
    weakResponseExample: 'Microservices use Docker and Kubernetes with gRPC and REST endpoints. Monoliths have tight coupling in spaghetti code, so microservices are modern and much better for agile DevOps.'
  }
];
