import { SpeechMetrics } from '@/types/interview';

const FILLER_WORDS = [
  'um',
  'uh',
  'uhm',
  'like',
  'basically',
  'actually',
  'you know',
  'sort of',
  'kind of',
  'literally',
  'i mean',
  'right',
  'so yeah'
];

export function analyzeAcousticAndSpeech(
  transcript: string,
  durationSeconds: number
): SpeechMetrics {
  const cleanText = transcript.trim();
  if (!cleanText) {
    return {
      durationSeconds: 0,
      wordCount: 0,
      wordsPerMinute: 0,
      fillerWordCount: 0,
      fillerWordsDetected: [],
      pacingAssessment: 'Optimal Pace'
    };
  }

  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Safe duration calculation (default to 60s if 0 to prevent division by zero)
  const safeDurationMinutes = Math.max(durationSeconds, 5) / 60;
  const wordsPerMinute = Math.round(wordCount / safeDurationMinutes);

  const lowerText = cleanText.toLowerCase();
  const detectedFillers: { word: string; count: number }[] = [];
  let totalFillers = 0;

  for (const filler of FILLER_WORDS) {
    // Regex matching word boundary
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      detectedFillers.push({
        word: filler,
        count: matches.length
      });
      totalFillers += matches.length;
    }
  }

  let pacingAssessment: 'Too Slow' | 'Optimal Pace' | 'Too Fast' = 'Optimal Pace';
  if (wordsPerMinute < 110) {
    pacingAssessment = 'Too Slow';
  } else if (wordsPerMinute > 165) {
    pacingAssessment = 'Too Fast';
  }

  return {
    durationSeconds: Math.round(durationSeconds),
    wordCount,
    wordsPerMinute,
    fillerWordCount: totalFillers,
    fillerWordsDetected: detectedFillers.sort((a, b) => b.count - a.count),
    pacingAssessment
  };
}
