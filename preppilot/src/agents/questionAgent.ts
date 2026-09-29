import OpenAI from 'openai';
import { CandidateProfile, InterviewQuestion, StageType } from '@/types/interview';
import { INITIAL_INTERVIEW_DATASET } from '@/data/interviewDataset';

export async function selectOrGenerateQuestion(
  profile: CandidateProfile,
  stage: StageType,
  userApiKey?: string,
  forceDynamicGeneration = false
): Promise<InterviewQuestion> {
  // If not forcing dynamic generation, find the best match from the curated dataset
  if (!forceDynamicGeneration) {
    const candidates = INITIAL_INTERVIEW_DATASET.filter(
      q => q.stage === stage && (q.role === profile.targetRole || q.stage === 'HR & Culture Screening')
    );
    if (candidates.length > 0) {
      // Pick one randomly or first
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Secondary fallback in dataset
    const stageCandidates = INITIAL_INTERVIEW_DATASET.filter(q => q.stage === stage);
    if (stageCandidates.length > 0) {
      return stageCandidates[Math.floor(Math.random() * stageCandidates.length)];
    }
  }

  // Dynamic Generation via OpenAI (or smart fallback)
  const effectiveApiKey = userApiKey || process.env.OPENAI_API_KEY || '';
  const effectiveBaseUrl = process.env.OPENAI_BASE_URL || 'https://aicredits.in/v1';
  const effectiveModel = process.env.OPENAI_MODEL || 'openai/gpt-5-nano';

  if (!effectiveApiKey) {
    // Deterministic fallback question generator
    return {
      id: `dyn-${Date.now()}`,
      role: profile.targetRole,
      stage,
      competency: `${profile.keySkills[0] || 'System Engineering'} Architecture & Implementation`,
      difficulty: profile.experienceYears >= 5 ? 'Senior' : 'Mid-Level',
      questionType: stage === 'Behavioral & STAR Competency' ? 'Behavioral' : 'Technical',
      question: `Given your background with ${profile.keySkills.join(', ')} as a ${profile.targetRole}, walk me through how you designed and deployed a mission-critical system, and how you ensured high reliability under unexpected operational load.`,
      expectedCompetencies: [
        'End-to-end architectural reasoning and ownership',
        'Failure domain isolation and observability',
        'Quantitative business outcome'
      ],
      evaluationCriteria: [
        'Demonstrates mastery over specified key skills',
        'Mentions trade-offs between latency, consistency, and cost',
        'Articulates clear personal contribution'
      ],
      idealStarResponse: `In our production deployment utilizing ${profile.keySkills[0] || 'distributed systems'}, we noticed a bottleneck under surge traffic. As the technical lead, I re-architected the ingestion queue, reducing latency by 40% and eliminating dropouts.`
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: effectiveApiKey,
      baseURL: effectiveBaseUrl,
    });
    const prompt = `You are the Interview Question Agent for an executive technical coaching platform.
Generate a tailored interview question for this candidate profile:
Role: ${profile.targetRole}
Experience: ${profile.experienceYears} years
Key Skills: ${profile.keySkills.join(', ')}
Target Interview Stage: ${stage}

Return ONLY valid JSON matching this structure:
{
  "id": "dyn-${Date.now()}",
  "role": "${profile.targetRole}",
  "stage": "${stage}",
  "competency": "Specific Technical or Behavioral Competency",
  "difficulty": "Mid-Level",
  "questionType": "Technical",
  "question": "The interview question",
  "expectedCompetencies": ["comp 1", "comp 2", "comp 3"],
  "evaluationCriteria": ["crit 1", "crit 2", "crit 3"],
  "idealStarResponse": "A 3-sentence model answer"
}`;

    const res = await openai.chat.completions.create({
      model: effectiveModel,
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    return {
      id: parsed.id || `dyn-${Date.now()}`,
      role: parsed.role || profile.targetRole,
      stage: parsed.stage || stage,
      competency: parsed.competency || 'Core Engineering Competency',
      difficulty: parsed.difficulty || 'Mid-Level',
      questionType: parsed.questionType || 'Technical',
      question: parsed.question || `Tell me about your experience with ${profile.keySkills.join(', ')}.`,
      expectedCompetencies: parsed.expectedCompetencies || ['Technical depth', 'Problem solving'],
      evaluationCriteria: parsed.evaluationCriteria || ['Clarity', 'Depth'],
      idealStarResponse: parsed.idealStarResponse
    };
  } catch (err) {
    console.error('Dynamic question generation error, falling back:', err);
    return INITIAL_INTERVIEW_DATASET[0];
  }
}
