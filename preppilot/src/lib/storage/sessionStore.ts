import { PracticeSessionRecord } from '@/types/interview';

const STORAGE_KEY = 'elevate_ai_sessions_v1';

export function getStoredSessions(): PracticeSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load sessions from localStorage:', err);
    return [];
  }
}

export function saveSession(session: PracticeSessionRecord): PracticeSessionRecord[] {
  if (typeof window === 'undefined') return [session];
  try {
    // New sessions are persisted in the canonical Project 7 shape. Legacy
    // aliases are read elsewhere only for historical-session compatibility.
    const { responseStructure: _legacyStructure, communicationQuality: _legacyCommunication, ...canonicalRubricScores } = session.coachingFeedback.rubricScores;
    const canonicalSession: PracticeSessionRecord = {
      ...session,
      coachingFeedback: {
        ...session.coachingFeedback,
        rubricScores: canonicalRubricScores as PracticeSessionRecord['coachingFeedback']['rubricScores'],
        overallScore: session.coachingFeedback.score,
      },
    };
    const existing = getStoredSessions();
    const updated = [canonicalSession, ...existing].slice(0, 50); // Keep last 50 sessions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
    return [];
  }
}

export function clearStoredSessions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear sessions:', err);
  }
}

export function computeLongitudinalMetrics(sessions: PracticeSessionRecord[]) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      averageWpm: 0,
      totalFillerWords: 0,
      recurringGaps: [] as { gap: string; frequency: number }[],
      trendScores: [] as number[],
      competencyAverages: {
        relevance: 0,
        clarity: 0,
        structure: 0,
        completeness: 0,
        quality: 0
      }
    };
  }

  const scores = sessions.map(s => s.coachingFeedback.score ?? s.coachingFeedback.overallScore);
  const totalScore = scores.reduce((a, b) => a + b, 0);

  const wpms = sessions.filter(s => s.speechMetrics).map(s => s.speechMetrics!.wordsPerMinute);
  const avgWpm = wpms.length > 0 ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : 135;

  const totalFillerWords = sessions.reduce((acc, s) => acc + (s.speechMetrics?.fillerWordCount || 0), 0);

  // Extract recurring gaps
  const gapCounts: Record<string, number> = {};
  for (const s of sessions) {
    for (const gap of s.coachingFeedback.recurringGapsIdentified || []) {
      gapCounts[gap] = (gapCounts[gap] || 0) + 1;
    }
  }

  const recurringGaps = Object.entries(gapCounts)
    .map(([gap, frequency]) => ({ gap, frequency }))
    .sort((a, b) => b.frequency - a.frequency);

  // Competency averages
  const relevance = Math.round(sessions.reduce((acc, s) => acc + s.coachingFeedback.rubricScores.relevance, 0) / sessions.length);
  const clarity = Math.round(sessions.reduce((acc, s) => acc + s.coachingFeedback.rubricScores.clarity, 0) / sessions.length);
  const structure = Math.round(sessions.reduce((acc, s) => acc + s.coachingFeedback.rubricScores.structure, 0) / sessions.length);
  const completeness = Math.round(sessions.reduce((acc, s) => acc + s.coachingFeedback.rubricScores.completeness, 0) / sessions.length);
  const quality = Math.round(sessions.reduce((acc, s) => acc + s.coachingFeedback.rubricScores.communication, 0) / sessions.length);

  return {
    totalSessions: sessions.length,
    averageScore: Math.round(totalScore / sessions.length),
    averageWpm: avgWpm,
    totalFillerWords,
    recurringGaps,
    trendScores: scores.slice(0, 10).reverse(),
    competencyAverages: {
      relevance,
      clarity,
      structure,
      completeness,
      quality
    }
  };
}
