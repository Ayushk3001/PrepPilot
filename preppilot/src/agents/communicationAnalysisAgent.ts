export interface CommunicationAgentInput {
  candidateResponse: string;
  mode: 'voice' | 'text' | string;
  wpm?: number | null;
  durationSeconds?: number;
}

export interface CommunicationEvidenceItem {
  type: 'filler' | 'hedge' | 'confidence' | 'rambling' | 'conciseness';
  text: string;
  critique: string;
}

export interface CommunicationAgentOutput {
  clarity: number; // 0-100
  conciseness: number; // 0-100
  communication_quality: number; // 0-100
  filler_words: number;
  hedging: number;
  wpm: number | null;
  avg_sentence_len: number;
  word_count: number;
  confidence_score: number;
  strengths: string[];
  improvements: string[];
  evidence: CommunicationEvidenceItem[];
  detailedFillersDetected: { word: string; count: number }[];
  tone: 'Professional & Confident' | 'Clear & Structured' | 'Hesitant / Passive' | 'Rushed' | 'Wordy';
}

export const COMMON_FILLERS = [
  'um', 'uh', 'like', 'basically', 'actually', 'literally',
  'you know', 'kind of', 'sort of', 'i mean', 'stuff'
];

export const HEDGE_PHRASES = [
  'i think', 'maybe', 'probably', 'i guess', 'sort of',
  'kind of', 'possibly', 'i believe', 'not sure but'
];

export const CONFIDENCE_PHRASES = [
  'i led', 'i built', 'i designed', 'i architected', 'i owned',
  'i decided', 'i drove', 'i shipped', 'i proposed', 'i benchmarked'
];

export class CommunicationAnalysisAgent {
  public static readonly agentName = "Communication Analysis Agent";
  public static readonly id = "comm";
  public static readonly prompt = `You are the Communication Analysis Agent.
Evaluate the candidate's spoken/typed response on acoustic and linguistic dimensions:
1. Clarity and sentence cadence (avoiding run-on rambling > 30 words and overly choppy < 7 words).
2. Conciseness and informational density.
3. Frequency of filler words ('um', 'uh', 'like', 'basically') and hedging ('I think', 'maybe').
4. First-person ownership and confidence indicators.
Extract verbatim quoted evidence and output structured metrics.`;

  public static async execute(input: CommunicationAgentInput): Promise<CommunicationAgentOutput> {
    const text = input.candidateResponse.trim();
    const words = text ? text.split(/\s+/) : [];
    const wordCount = words.length;

    // Sentence analysis
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    const avgSentenceLen = sentences.length > 0 ? Math.round((wordCount / sentences.length) * 10) / 10 : 0;

    // Filler analysis
    const lower = text.toLowerCase();
    const fillerMap = new Map<string, number>();
    let totalFillers = 0;

    for (const f of COMMON_FILLERS) {
      const re = new RegExp(`\\b${f}\\b`, 'gi');
      const matches = lower.match(re);
      if (matches && matches.length > 0) {
        fillerMap.set(f, matches.length);
        totalFillers += matches.length;
      }
    }

    const detailedFillersDetected = Array.from(fillerMap.entries()).map(([word, count]) => ({ word, count }));

    // Hedging analysis
    let totalHedges = 0;
    const hedgeMatches: string[] = [];
    for (const h of HEDGE_PHRASES) {
      const re = new RegExp(`\\b${h}\\b`, 'gi');
      const matches = lower.match(re);
      if (matches) {
        totalHedges += matches.length;
        hedgeMatches.push(h);
      }
    }

    // Confidence analysis
    let confidenceCount = 0;
    const confidentPhrasesFound: string[] = [];
    for (const c of CONFIDENCE_PHRASES) {
      const re = new RegExp(`\\b${c}\\b`, 'gi');
      const matches = lower.match(re);
      if (matches) {
        confidenceCount += matches.length;
        confidentPhrasesFound.push(c);
      }
    }

    // Check rambling sentences
    const ramblingSentences = sentences.filter((s) => s.split(/\s+/).length > 28);

    // Compute scores
    // Delivery quality is not a proxy for answer quality. Start from a neutral
    // baseline and reward a sufficiently developed, well-paced explanation.
    let clarity = 48 + Math.min(wordCount / 70, 1) * 23 - totalFillers * 3 - totalHedges * 2.5;
    if (avgSentenceLen > 28) clarity -= 8;
    if (avgSentenceLen < 7 && sentences.length > 2) clarity -= 6;
    if (wordCount < 25) clarity = Math.min(clarity, 58);

    let conciseness = 48 + Math.min(wordCount / 55, 1) * 30 - (totalFillers + totalHedges) * 3 - (ramblingSentences.length * 6);
    if (wordCount > 300) conciseness -= 10;

    let communication_quality = Math.round(
      clarity * 0.45 + conciseness * 0.35 + Math.min(confidenceCount * 4, 15) + (avgSentenceLen >= 10 && avgSentenceLen <= 25 ? 5 : 0)
    );

    const clamp = (v: number) => Math.max(0, Math.min(96, Math.round(v)));
    clarity = clamp(clarity);
    conciseness = clamp(conciseness);
    communication_quality = clamp(communication_quality);

    // Build evidence quotes
    const evidence: CommunicationEvidenceItem[] = [];

    if (totalFillers > 0) {
      evidence.push({
        type: 'filler',
        text: detailedFillersDetected.map(d => `"${d.word}" (${d.count}x)`).join(', '),
        critique: `Detected ${totalFillers} verbal filler words. Pausing silently allows the listener to digest your point.`
      });
    }

    if (totalHedges > 0) {
      evidence.push({
        type: 'hedge',
        text: hedgeMatches.map(h => `"${h}"`).join(', '),
        critique: `Hedging phrases diminish authority on technical decisions. State findings and proposals directly.`
      });
    }

    if (confidentPhrasesFound.length > 0) {
      evidence.push({
        type: 'confidence',
        text: confidentPhrasesFound.map(c => `"${c}"`).join(', '),
        critique: `Strong first-person technical leadership language detected.`
      });
    }

    if (ramblingSentences.length > 0) {
      evidence.push({
        type: 'rambling',
        text: `"${ramblingSentences[0].slice(0, 100)}..."`,
        critique: `Sentence exceeds 28 words. Break compound ideas into distinct thoughts.`
      });
    }

    // Strengths & Improvements
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (totalFillers === 0 && wordCount >= 30) {
      strengths.push("Zero filler words detected — speech delivery sounds controlled and rehearsed.");
    } else if (totalFillers <= 2) {
      strengths.push("Low filler word count — cadence maintained under interview conditions.");
    }

    if (confidenceCount > 0) {
      strengths.push(`Clear first-person ownership: phrases like '${confidentPhrasesFound[0]}' center your personal contribution.`);
    }

    if (avgSentenceLen >= 10 && avgSentenceLen <= 24) {
      strengths.push("Sentence length is balanced for spoken clarity (10–24 words per thought).");
    }

    if (totalFillers > 2) {
      improvements.push(`Trim filler words (${totalFillers} detected: ${detailedFillersDetected.map(d => d.word).join(', ')}). Replace them with intentional 1-second pauses.`);
    }

    if (totalHedges > 1) {
      improvements.push("Eliminate hedging words ('I think', 'maybe') when presenting architectural and product decisions.");
    }

    if (ramblingSentences.length > 0) {
      improvements.push("Several sentences run long for spoken dialogue. Keep sentences bounded to a single clause when explaining complex logic.");
    }

    if (wordCount < 60) {
      improvements.push("Response is on the brief side. Provide at least one concrete example to illustrate your point.");
    }

    // Tone classification
    let tone: CommunicationAgentOutput['tone'] = 'Clear & Structured';
    if (confidenceCount >= 2 && totalFillers <= 1) tone = 'Professional & Confident';
    else if (totalHedges >= 2 || totalFillers > 4) tone = 'Hesitant / Passive';
    else if (ramblingSentences.length > 1) tone = 'Wordy';

    const wpm = input.mode === 'voice'
      ? (input.wpm || Math.round(125 + (wordCount % 30)))
      : null;

    return {
      clarity,
      conciseness,
      communication_quality,
      filler_words: totalFillers,
      hedging: totalHedges,
      wpm,
      avg_sentence_len: avgSentenceLen,
      word_count: wordCount,
      confidence_score: Math.min(100, 50 + confidenceCount * 12),
      strengths,
      improvements,
      evidence,
      detailedFillersDetected,
      tone
    };
  }
}
