import {
  CandidateProfile,
  InterviewQuestion,
  SpeechMetrics,
  CoachingFeedback,
  StarAnalysis,
  CommunicationFeedback,
  ContentFeedback
} from '@/types/interview';

export function runOfflineMultiAgentAnalysis(
  candidateProfile: CandidateProfile,
  question: InterviewQuestion,
  candidateResponse: string,
  speechMetrics?: SpeechMetrics
): CoachingFeedback {
  const words = candidateResponse.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = candidateResponse.toLowerCase();

  // --- 1. Communication Analysis Heuristics ---
  const fillerCount = speechMetrics?.fillerWordCount ?? 0;
  let clarityScore = 80;
  if (wordCount < 40) clarityScore = 55;
  else if (wordCount > 350) clarityScore = 65; // rambling
  if (fillerCount > 5) clarityScore -= Math.min(25, fillerCount * 3);

  const concisenessScore = wordCount < 50 ? 60 : wordCount > 300 ? 58 : 88;
  const commQuality = Math.round((clarityScore + concisenessScore) / 2);

  const commFeedback: CommunicationFeedback = {
    clarityScore: Math.max(30, Math.min(95, clarityScore)),
    concisenessScore: Math.max(30, Math.min(95, concisenessScore)),
    tone: wordCount < 30 ? 'Hesitant / Passive' : wordCount > 350 ? 'Rushed' : 'Professional & Confident',
    communicationQualityScore: Math.max(30, Math.min(95, commQuality)),
    strengths: [
      wordCount >= 60 ? 'Maintained an articulate, conversational flow' : 'Direct and to the point',
      fillerCount <= 2 ? 'Minimal reliance on verbal crutches' : 'Courteous and clear engagement tone'
    ],
    fillerWordCritique: fillerCount > 0 
      ? `Detected ${fillerCount} filler words (${speechMetrics?.fillerWordsDetected?.map(f => `"${f.word}" x${f.count}`).join(', ')}). Replacing these with deliberate micro-pauses will project stronger executive presence.`
      : 'Commendable vocal clarity with zero distracting filler words.',
    pacingCritique: speechMetrics 
      ? `Speaking pace was estimated at ${speechMetrics.wordsPerMinute} WPM (${speechMetrics.pacingAssessment}). Target 130–150 WPM for maximum listener comprehension.`
      : 'Pacing appears balanced based on response length and density.'
  };

  // --- 2. Content & Competency Analysis ---
  let relevanceScore = 75;
  const matchedCompetencies: string[] = [];
  const missedPoints: string[] = [];

  for (const exp of question.expectedCompetencies) {
    const keyWords = exp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matched = keyWords.some(w => lower.includes(w));
    if (matched) {
      matchedCompetencies.push(exp);
      relevanceScore += 5;
    } else {
      missedPoints.push(exp);
    }
  }

  // Extract real quote from user's response
  const sentences = candidateResponse.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const groundedQuotes = sentences.slice(0, 2).map(s => `"${s.trim()}"`);

  const contentFeedback: ContentFeedback = {
    relevanceScore: Math.min(95, Math.max(40, relevanceScore)),
    technicalDepthScore: question.questionType === 'Technical' ? (wordCount > 100 ? 82 : 60) : 78,
    accuracyScore: 82,
    completenessScore: Math.round((matchedCompetencies.length / Math.max(1, question.expectedCompetencies.length)) * 100),
    demonstratedCompetencies: matchedCompetencies.length > 0 ? matchedCompetencies : [question.expectedCompetencies[0]],
    missedKeyPoints: missedPoints.length > 0 ? missedPoints : ['Elaborate on edge-case tradeoffs and operational metrics'],
    groundedEvidenceQuotes: groundedQuotes.length > 0 ? groundedQuotes : [`"${candidateResponse.slice(0, 80)}..."`]
  };

  // --- 3. STAR Structure Agent Analysis ---
  let starBreakdown: StarAnalysis | undefined;
  if (question.questionType === 'Behavioral' || question.stage === 'Behavioral & STAR Competency') {
    const hasSituation = lower.includes('situation') || lower.includes('when') || lower.includes('project') || lower.includes('during');
    const hasTask = lower.includes('task') || lower.includes('goal') || lower.includes('needed to') || lower.includes('had to') || lower.includes('responsible');
    const hasAction = lower.includes('action') || lower.includes('i built') || lower.includes('i designed') || lower.includes('i spoke') || lower.includes('i implemented') || lower.includes('i initiated');
    const hasResult = lower.includes('result') || lower.includes('outcome') || lower.includes('%') || lower.includes('reduced') || lower.includes('improved') || lower.includes('delivered');
    const hasMetric = /\b(\d+%|\$\d+|\d+\s*ms|\d+\s*users|\d+\s*days|\d+\s*weeks)\b/i.test(candidateResponse);

    starBreakdown = {
      situation: {
        present: hasSituation,
        snippet: hasSituation ? sentences[0]?.trim() : undefined,
        score: hasSituation ? 85 : 45,
        critique: hasSituation ? 'Context and team environment were framed properly.' : 'Missing explicit project context, company environment, or timeline.'
      },
      task: {
        present: hasTask,
        snippet: hasTask ? (sentences[1] ?? sentences[0])?.trim() : undefined,
        score: hasTask ? 80 : 40,
        critique: hasTask ? 'Clearly identified personal responsibility.' : 'Did not clearly distinguish your specific ownership from the broader team.'
      },
      action: {
        present: hasAction,
        snippet: hasAction ? (sentences[2] ?? sentences[1])?.trim() : undefined,
        score: hasAction ? 85 : 50,
        critique: hasAction ? 'Detailed actionable interventions.' : 'Too passive or high-level. Specify exact tools, methodologies, and technical steps you executed.'
      },
      result: {
        present: hasResult,
        snippet: hasResult ? sentences[sentences.length - 1]?.trim() : undefined,
        score: hasResult && hasMetric ? 90 : hasResult ? 65 : 35,
        critique: hasResult && hasMetric 
          ? 'Strong quantifiable outcome tied to business or performance metrics.'
          : 'Weak or qualitative result. Elevate your answer with quantifiable metrics (e.g. % latency cut, $ saved, hours recovered).',
        quantifiable: hasMetric
      },
      overallStarScore: Math.round(((hasSituation ? 85 : 45) + (hasTask ? 80 : 40) + (hasAction ? 85 : 50) + (hasResult ? (hasMetric ? 90 : 65) : 35)) / 4)
    };
  }

  // --- 4. Synthesis & Lead Coach Scoring ---
  const overallScore = Math.round(
    (commFeedback.communicationQualityScore * 0.3) +
    (contentFeedback.relevanceScore * 0.35) +
    ((starBreakdown ? starBreakdown.overallStarScore : contentFeedback.technicalDepthScore) * 0.35)
  );

  const verdict = overallScore >= 82 
    ? 'Ready for Next Stage' 
    : overallScore >= 65 
    ? 'Promising - Needs Refinement' 
    : 'Needs Substantial Practice';

  return {
    overallScore,
    verdict,
    rubricScores: {
      relevance: contentFeedback.relevanceScore,
      clarity: commFeedback.clarityScore,
      responseStructure: starBreakdown ? starBreakdown.overallStarScore : 78,
      completeness: contentFeedback.completenessScore,
      communicationQuality: commFeedback.communicationQualityScore
    },
    strengths: [
      ...commFeedback.strengths,
      `Directly addressed primary competency: ${contentFeedback.demonstratedCompetencies[0] || question.competency}`,
      'Demonstrated practical software engineering awareness'
    ],
    areasForImprovement: [
      commFeedback.fillerWordCritique,
      contentFeedback.missedKeyPoints[0] ? `Incorporate: ${contentFeedback.missedKeyPoints[0]}` : 'Provide deeper architectural trade-offs',
      starBreakdown && !starBreakdown.result.quantifiable 
        ? 'Quantify your outcome: add percentages, dollar savings, or throughput gains to anchor your results.'
        : 'Deepen the contrast between alternative design options before deciding.'
    ],
    starBreakdown,
    communicationAnalysis: commFeedback,
    contentEvaluation: contentFeedback,
    improvedModelAnswer: question.idealStarResponse || `In approaching ${question.competency}, a top-tier answer starts with concrete context: "In my recent role supporting high-scale distributed systems, I tackled a similar challenge..." followed by exact technical actions, trade-offs analyzed, and a quantifiable outcome demonstrating measurable business value.`,
    answerRewriteGuidance: [
      'Begin immediately with your thesis statement or context; avoid warmup phrases like "So basically, in my experience..."',
      'Use the rule of three: "I approached this through three specific actions: 1) architectural benchmarking, 2) stakeholder alignment, and 3) automated guardrails."',
      'Always conclude with the business and engineering ROI: "This reduced p99 latency by 32% and eliminated recurring support escalations."'
    ],
    adaptiveFollowUpQuestion: {
      question: `You mentioned your approach to ${question.competency}. If your initial deployment encountered a 20% latency regression under peak traffic, how would you triage the root cause in real time?`,
      intent: 'Probe deeper troubleshooting resilience and observability under production pressure.',
      probingArea: 'Production telemetry and incident isolation'
    },
    personalizedImprovementPlan: {
      immediateFix: 'In your next practice run, pause for 1 second instead of uttering filler words when formulating your thoughts.',
      mediumTermPractice: 'Structure all behavioral and scenario responses with a crisp 4-part framework: Context (15%), Ownership/Task (15%), Action Details (50%), Quantifiable Impact (20%).',
      recommendedFramework: question.questionType === 'Behavioral' ? 'STAR (Situation, Task, Action, Result)' : 'PREP (Point, Reason, Example, Point)'
    },
    curatedResources: [
      {
        topic: question.competency,
        type: 'video',
        title: `${question.competency} — Architecture Deep Dive & Interview Guide`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(question.competency + ' interview architecture system design')}`,
        provider: 'YouTube',
        estimatedTime: '18 mins',
        reason: `Targeted review for your missed architectural points: ${contentFeedback.missedKeyPoints[0] || 'Edge-case resiliency'}.`
      },
      {
        topic: question.questionType === 'Behavioral' ? 'STAR Methodology' : 'Distributed Systems Resilience',
        type: 'tutorial',
        title: question.questionType === 'Behavioral' 
          ? 'Quantifying Engineering Impact: The Senior Engineer STAR Playbook'
          : 'High-Throughput Event Streaming & 5-Nines High Availability',
        url: question.questionType === 'Behavioral'
          ? 'https://www.youtube.com/results?search_query=STAR+method+engineering+interview+quantifiable+results'
          : 'https://www.youtube.com/results?search_query=distributed+systems+event+driven+architecture+kafka+ebpf',
        provider: 'YouTube',
        estimatedTime: '14 mins',
        reason: 'Recommended drill to strengthen your quantifiable results and structural crispness.'
      },
      {
        topic: 'Prodapt Engineering Standards',
        type: 'documentation',
        title: 'TM Forum Open Digital Architecture (ODA) & Cloud-Native Specifications',
        url: 'https://www.tmforum.org/oda/',
        provider: 'Official Docs',
        estimatedTime: '10 mins read',
        reason: 'Master standard open APIs (TMF 642, 622) for carrier-grade OSS/BSS transformations.'
      }
    ],
    recurringGapsIdentified: [
      fillerCount > 3 ? 'Recurrent filler word usage during transitions' : 'Opportunity to add more quantitative metrics',
      'Brief hesitation before explaining technical trade-offs'
    ]
  };
}
