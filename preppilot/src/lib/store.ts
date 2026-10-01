// @ts-nocheck
const KEY = "cadence_sessions_v1";

function storageKey() {
  if (typeof window === "undefined") return KEY;
  try {
    const user = JSON.parse(localStorage.getItem("cadence_user") || "null");
    return user?.id ? `${KEY}:${user.id}` : `${KEY}:guest`;
  } catch {
    return `${KEY}:guest`;
  }
}

export function loadSessions() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSessions() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(storageKey());
  }
}

export function saveSession(session) {
  const list = loadSessions().filter((s) => s.id !== session.id);
  list.unshift(session);
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, 60)));
  }
  return list;
}

// Session records exist in two formats in the app: the dashboard's compact
// round record and the canonical evaluation record. Keep the dashboard
// independent from either storage shape and, importantly, never substitute a
// fixed score when an older record has no usable score.
export function getSessionScore(session) {
  if (!session || typeof session !== "object") return undefined;

  // A completed round can carry both a summary score and its turn-level
  // evaluations. The turn evaluations are the underlying evidence, so use
  // their average first. This also repairs historical rows whose summary was
  // accidentally persisted as the same default for every round.
  if (Array.isArray(session.turns)) {
    const turnScores = session.turns
      .map((turn) => getSessionScore(turn?.result || turn))
      .filter((score) => score !== undefined);
    if (turnScores.length) {
      return Math.round(turnScores.reduce((sum, score) => sum + score, 0) / turnScores.length);
    }
  }

  const candidates = [
    session.coachingFeedback?.score,
    session.coachingFeedback?.overallScore,
    session.result?.overall,
    session.result?.score,
    session.overall,
    session.score,
  ];

  for (const value of candidates) {
    const score = Number(value);
    if (Number.isFinite(score) && score >= 0 && score <= 100) return Math.round(score);
  }

  return undefined;
}

export function profile(sessions = loadSessions()) {
  if (!sessions.length) return { index: 0, avg: 0, starRate: 0, streak: 0, trend: [], gaps: [], weekCount: 0 };
  const scoredSessions = sessions
    .map((session) => ({ session, score: getSessionScore(session) }))
    .filter(({ score }) => score !== undefined);
  const sorted = scoredSessions
    .sort((a, b) => new Date(a.session.createdAt || a.session.timestamp).getTime() - new Date(b.session.createdAt || a.session.timestamp).getTime());
  const avg = sorted.length
    ? Math.round(sorted.reduce((sum, item) => sum + item.score, 0) / sorted.length)
    : 0;
  const last5 = sorted.slice(-5);
  const avgOf = (l) => l.length ? l.reduce((sum, item) => sum + item.score, 0) / l.length : 0;
  const index = Math.round(avgOf(last5));

  const starRate = Math.round(
    (sessions.filter((s) => (s.starFilled || 0) >= 3).length / sessions.length) * 100
  );
  const trend = sorted.slice(-10).map(({ session, score }) => ({
    date: new Date(session.createdAt || session.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score,
  }));

  const daySet = new Set(sessions.map((s) => new Date(s.createdAt).toDateString()));
  let streak = 0;
  const d = new Date();
  while (daySet.has(d.toDateString()) || streak === 0) {
    if (!daySet.has(d.toDateString())) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const gapTally = { fillers: 0, results: 0, structure: 0, hedges: 0, thin: 0 };
  sessions.forEach((s) => {
    if ((s.metrics?.fillers || 0) > 2) gapTally.fillers++;
    if (!(s.star?.result?.detected ?? (s.starFilled || 0) >= 4)) gapTally.results++;
    if ((s.scores?.structure || 100) < 70) gapTally.structure++;
    if ((s.metrics?.hedges || 0) > 2) gapTally.hedges++;
    if ((s.metrics?.words || 0) < 90) gapTally.thin++;
  });
  const gaps = Object.entries(gapTally)
    .map(([k, v]) => ({
      key: k,
      count: v,
      pct: Math.round((v / sessions.length) * 100),
      label: {
        fillers: "Filler words under pressure",
        results: "Unquantified results",
        structure: "Weak signposting",
        hedges: "Hedging language",
        thin: "Answers below expected depth",
      }[k],
    }))
    .filter((g) => g.pct >= 30)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const weekAgo = base() - 7 * 864e5;
  const weekCount = sessions.filter((s) => new Date(s.createdAt).getTime() > weekAgo).length;

  return { index, avg, starRate, streak, trend, gaps, weekCount, total: sessions.length };
}

const base = () => Date.now();
