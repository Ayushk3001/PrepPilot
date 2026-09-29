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

export function profile(sessions = loadSessions()) {
  if (!sessions.length) return { index: 0, avg: 0, starRate: 0, streak: 0, trend: [], gaps: [], weekCount: 0 };
  const sorted = [...sessions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const avg = Math.round(sorted.reduce((a, s) => a + s.overall, 0) / sorted.length);
  const last5 = sorted.slice(-5);
  const first5 = sorted.slice(0, 5);
  const avgOf = (l) => l.reduce((a, s) => a + s.overall, 0) / Math.max(l.length, 1);
  const index = Math.round(avgOf(last5));

  const starRate = Math.round(
    (sessions.filter((s) => (s.starFilled || 0) >= 3).length / sessions.length) * 100
  );
  const trend = sorted.slice(-10).map((s) => ({
    date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: s.overall,
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
