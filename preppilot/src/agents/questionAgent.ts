import { CandidateProfile, InterviewQuestion, StageType } from '@/types/interview';
import { INITIAL_INTERVIEW_DATASET } from '@/data/interviewDataset';
import { traceInterviewStage, traceLlmCall } from '@/lib/interview/tracing';
import { DEFAULT_BASE_URL, DEFAULT_MODEL, executeChatCompletion, extractChatCompletionContent, getChatCompletionContentLocations } from '@/server/ai/llmClient';

const QUESTION_GENERATION_TIMEOUT_MS = 20_000;

export async function selectOrGenerateQuestion(
  profile: CandidateProfile,
  stage: StageType,
  userApiKey?: string,
  forceDynamicGeneration = false
): Promise<InterviewQuestion> {
  const effectiveApiKey = userApiKey || process.env.OPENAI_API_KEY || '';
  const effectiveBaseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const effectiveModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  // The curated bank remains the offline/default path. When a key exists,
  // dynamic generation is attempted first so a configured LLM is never
  // silently bypassed by a hardcoded question.
  if (!forceDynamicGeneration && !effectiveApiKey.trim()) {
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
  if (!effectiveApiKey) {
    // Deterministic fallback question generator
    const fallbackQuestion: InterviewQuestion = {
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
      console.info('[QUESTION_GENERATION] question_source=fallback fallback_reason=no_api_key');
    return fallbackQuestion;
  }

  try {
    const prompt = `You are the Interview Question Agent for an executive technical coaching platform.
Generate a tailored interview question for this candidate profile:
Role: ${profile.targetRole}
Experience: ${profile.experienceYears} years
Key Skills: ${profile.keySkills.join(', ')}
Target Interview Stage: ${stage}

Return ONLY valid JSON matching exactly {"question":"The interview question"}.
Do not include markdown, code fences, analysis, reasoning, explanations, or other properties.
/*
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
}*/`;

    const minimalPrompt = `Generate exactly one interview question for role ${profile.targetRole}, stage ${stage}, experience ${profile.experienceYears} years, and skills ${profile.keySkills.join(', ')}. Return only {"question":"<maximum 45-word interview question>"}. No reasoning, explanation, markdown, preamble, scoring, or additional fields.`;
    const messages = [{ role: 'system' as const, content: minimalPrompt }];
    const res = await traceLlmCall('llm_question_generation', messages, () => executeChatCompletion({
      model: effectiveModel,
      messages,
      responseFormat: 'json_object',
      temperature: 0.7,
      apiKey: effectiveApiKey,
      baseURL: effectiveBaseUrl,
      timeoutMs: QUESTION_GENERATION_TIMEOUT_MS,
      maxRetries: 0,
      maxOutputTokens: 800,
      reasoningEffort: 'low',
      caller: 'interviewer.legacy_generate_question',
      purpose: 'interview_question_generation',
      questionSource: 'llm',
    }), { model: effectiveModel, baseURL: effectiveBaseUrl, metadata: { purpose: 'interview_question_generation', question_source: 'llm' } });

    const question = await traceInterviewStage('question_validation', () => {
      const choice = (res as any)?.choices?.[0];
      const raw = extractChatCompletionContent(res);
      const finishReason = choice?.finish_reason || 'unknown';
      const usage = (res as any)?.usage;
      let parsed: any = null;
      let parseStatus = 'failed';
      try {
        parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
        parseStatus = 'json';
      } catch {
        const quoted = raw.match(/"question"\s*:\s*"([\s\S]*?)"/i)?.[1];
        const plain = quoted || (raw && !raw.startsWith('{') ? raw.replace(/^question\s*:\s*/i, '').trim() : '');
        if (plain) { parsed = { question: plain.replace(/^['"]|['"]$/g, '').trim() }; parseStatus = 'plain_text_recovered'; }
      }
      const text = typeof parsed?.question === 'string' ? parsed.question.trim() : '';
      const valid = Boolean(text) && text.split(/\s+/).length >= 5 && text.split(/\s+/).length <= 60 && finishReason !== 'length';
      const validationError = valid ? undefined : finishReason === 'length' ? 'provider_output_truncated' : !raw ? 'empty_provider_response' : parseStatus === 'failed' ? 'malformed_structured_output' : 'semantic_validation_failed';
      console.info('[QUESTION_PARSE_DIAGNOSTIC]', JSON.stringify({ finish_reason: finishReason, raw_response_length: raw.length, raw_response_preview: raw.slice(0, 240), content_type: typeof choice?.message?.content, content_locations: getChatCompletionContentLocations(res), completion_tokens: usage?.completion_tokens, parsed_response: parsed ? { question: text.slice(0, 240) } : null, parse_status: parseStatus, validation_success: valid, validation_error: validationError }));
      if (!valid) throw new Error(validationError || 'semantic_validation_failed');
      return {
        id: parsed.id || `dyn-${Date.now()}`, role: profile.targetRole, stage,
        competency: parsed.competency || 'Core Engineering Competency', difficulty: parsed.difficulty || 'Mid-Level',
        questionType: parsed.questionType || 'Technical', question: text,
        expectedCompetencies: Array.isArray(parsed.expectedCompetencies) && parsed.expectedCompetencies.length ? parsed.expectedCompetencies : ['Technical depth', 'Problem solving'],
        evaluationCriteria: Array.isArray(parsed.evaluationCriteria) && parsed.evaluationCriteria.length ? parsed.evaluationCriteria : ['Clarity', 'Depth'], idealStarResponse: parsed.idealStarResponse,
      };
    }, { interview_type: stage, question_source: 'llm', model: effectiveModel });
    console.info('[QUESTION_GENERATION] question_source=llm');
    return question;
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const reason = message.includes('timeout') ? 'timeout'
      : message.includes('json') || message.includes('invalid_model_response') ? 'invalid_model_response'
        : message.includes('401') || message.includes('403') || message.includes('api key') || message.includes('authentication') ? 'invalid_or_unreachable_provider'
          : 'invalid_or_unreachable_provider';
    console.info(`[QUESTION_GENERATION] question_source=fallback fallback_reason=${reason}`);
    return INITIAL_INTERVIEW_DATASET[0];
  }
}
