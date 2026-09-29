// @ts-nocheck
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const RESOURCE_LIBRARY = {
  fastapi: {
    label: "FastAPI & Python APIs",
    blurb: "Build and explain production-grade APIs — routing, async, dependency injection, auth.",
    items: [
      { type: "docs", label: "FastAPI official tutorial — async, DI, security", url: "https://fastapi.tiangolo.com/tutorial/", source: "fastapi.tiangolo.com" },
      { type: "youtube", label: "FastAPI full courses — curated search", url: yt("FastAPI full course"), source: "YouTube" },
      { type: "article", label: "FastAPI repo — examples & patterns", url: "https://github.com/tiangolo/fastapi", source: "GitHub" },
    ],
  },
  python: {
    label: "Python engineering",
    blurb: "Language depth interviewers probe: data structures, decorators, generators, testing.",
    items: [
      { type: "docs", label: "The Python tutorial — straight from the source", url: "https://docs.python.org/3/tutorial/", source: "docs.python.org" },
      { type: "youtube", label: "Python deep-dive courses — curated search", url: yt("Python advanced course data structures decorators"), source: "YouTube" },
      { type: "article", label: "pytest — testing the way interviewers expect", url: "https://docs.pytest.org/en/stable/", source: "docs.pytest.org" },
    ],
  },
  sql: {
    label: "SQL & data modeling",
    blurb: "Joins, window functions, indexing — and when you would denormalize.",
    items: [
      { type: "article", label: "SQLBolt — interactive join & query practice", url: "https://sqlbolt.com/", source: "sqlbolt.com" },
      { type: "article", label: "Mode SQL tutorial — analytics-grade queries", url: "https://mode.com/sql-tutorial/", source: "mode.com" },
      { type: "youtube", label: "SQL interview question walkthroughs — curated search", url: yt("SQL interview questions window functions"), source: "YouTube" },
    ],
  },
  "system-design": {
    label: "System design",
    blurb: "Scaling, caching, queues, trade-offs — how seniors frame architecture answers.",
    items: [
      { type: "article", label: "System Design Primer — the canonical open-source guide", url: "https://github.com/donnemartin/system-design-primer", source: "GitHub" },
      { type: "youtube", label: "System design interview walkthroughs — curated search", url: yt("system design interview"), source: "YouTube" },
      { type: "docs", label: "Kubernetes concepts — for infrastructure depth", url: "https://kubernetes.io/docs/concepts/", source: "kubernetes.io" },
    ],
  },
  devops: {
    label: "Cloud, Docker & Kubernetes",
    blurb: "Containers, CI/CD and the deployment stories cloud roles expect.",
    items: [
      { type: "docs", label: "Docker Get Started — images, containers, compose", url: "https://docs.docker.com/get-started/", source: "docs.docker.com" },
      { type: "docs", label: "Kubernetes tutorials — deploy & scale a real app", url: "https://kubernetes.io/docs/tutorials/", source: "kubernetes.io" },
      { type: "youtube", label: "DevOps interview scenarios — curated search", url: yt("DevOps interview questions scenario"), source: "YouTube" },
    ],
  },
  pandas: {
    label: "Data analysis with pandas",
    blurb: "Wrangle, aggregate and explain data — the analyst's core interview loop.",
    items: [
      { type: "docs", label: "pandas Getting Started — 10 minutes to real work", url: "https://pandas.pydata.org/docs/getting_started/index.html", source: "pandas.pydata.org" },
      { type: "youtube", label: "pandas full tutorials — curated search", url: yt("pandas tutorial for data analysis"), source: "YouTube" },
      { type: "article", label: "Kaggle Learn — pandas & SQL hands-on micro-courses", url: "https://www.kaggle.com/learn", source: "kaggle.com" },
    ],
  },
  product: {
    label: "Product sense & metrics",
    blurb: "Prioritization frameworks, success metrics and launch trade-off stories.",
    items: [
      { type: "youtube", label: "Product sense & metrics interviews — curated search", url: yt("product manager interview metrics product sense"), source: "YouTube" },
      { type: "article", label: "Mind the Product — articles on prioritization & discovery", url: "https://www.mindtheproduct.com/blog/", source: "mindtheproduct.com" },
      { type: "article", label: "Reforge-style metric teardowns — curated search", url: yt("product metrics teardown AARRR"), source: "YouTube" },
    ],
  },
  star: {
    label: "STAR method & answer structure",
    blurb: "Situation, Task, Action, Result — the structure most answers are missing.",
    items: [
      { type: "youtube", label: "STAR method explained with examples — curated search", url: yt("STAR method interview examples"), source: "YouTube" },
      { type: "article", label: "The STAR interview method, explained with sample answers", url: "https://www.themuse.com/advice/star-interview-method", source: "themuse.com" },
      { type: "youtube", label: "Behavioral question drills — curated search", url: yt("behavioral interview questions and answers practice"), source: "YouTube" },
    ],
  },
  behavioral: {
    label: "Behavioral interview depth",
    blurb: "Picking stronger stories, owning failures, and ending every answer with impact.",
    items: [
      { type: "youtube", label: "Top behavioral questions, answered live — curated search", url: yt("behavioral interview best answers tell me about a time"), source: "YouTube" },
      { type: "article", label: "Big list of behavioral questions to rehearse against", url: "https://github.com/vicky002/100-Master-Interview-Questions", source: "GitHub" },
      { type: "youtube", label: "Failure & conflict story teardowns — curated search", url: yt("tell me about a time you failed interview answer"), source: "YouTube" },
    ],
  },
  communication: {
    label: "Clear spoken communication",
    blurb: "Killing fillers, pacing, and saying more with fewer words — on the spot.",
    items: [
      { type: "youtube", label: "Speak clearly & stop filler words — curated search", url: yt("how to stop filler words speak clearly communication"), source: "YouTube" },
      { type: "youtube", label: "Structured speaking frameworks — curated search", url: yt("structured verbal communication framework PREP"), source: "YouTube" },
      { type: "article", label: "Toastmasters — free public-speaking practice guides", url: "https://www.toastmasters.org/resources/public-speaking-tips", source: "toastmasters.org" },
    ],
  },
};

const ROLE_SKILL = {
  swe: "python",
  sse: "fastapi",
  pm: "product",
  da: "pandas",
  ba: "sql",
  devops: "devops",
  em: "system-design",
  cs: "communication",
};

const GAP_TOPIC = {
  fillers: "communication",
  results: "star",
  structure: "star",
  hedges: "communication",
  thin: "behavioral",
};

export function recommendedTopics({ scores = {}, role, gaps = [] }: any = {}) {
  const t = new Set();
  if ((scores.structure ?? 100) < 78) t.add("star");
  if ((scores.clarity ?? 100) < 78 || (scores.communication ?? 100) < 78) t.add("communication");
  if ((scores.completeness ?? 100) < 78 || (scores.relevance ?? 100) < 78) t.add(ROLE_SKILL[role] || "behavioral");
  gaps.forEach((g) => GAP_TOPIC[g.key] && t.add(GAP_TOPIC[g.key]));
  if (!t.size) t.add(ROLE_SKILL[role] || "star");
  return [...t].slice(0, 3);
}

/** A bounded, structured recommendation payload built only from the curated catalog. */
export function getRecommendedResources({ scores = {}, role, weaknesses = [], turns = [] }: any = {}) {
  const topics = recommendedTopics({ scores, role });
  const askedText = turns.map((turn) => `${turn.question?.text || ''} ${turn.question?.competency || ''}`).join(' ').toLowerCase();
  if (/\bsql|query|join|database\b/.test(askedText)) topics.unshift('sql');
  if (/\bpandas|python|excel|dashboard|data quality\b/.test(askedText)) topics.unshift('pandas');

  const seen = new Set();
  return [...new Set(topics)].flatMap((topic) => {
    const group = RESOURCE_LIBRARY[topic];
    if (!group) return [];
    const weakness = weaknesses.find((item) => item.toLowerCase().includes(topic === 'star' ? 'star' : topic))
      || (topic === 'star' ? 'Your response structure needs clearer Situation, Action, and Result framing.'
        : topic === 'communication' ? 'Your communication score indicates an opportunity to be clearer and more concise.'
        : `This supports the weakest role-relevant area identified in your interview.`);
    return group.items.map((item, index) => ({
      id: `${topic}-${index}`,
      type: item.type === 'docs' ? 'Documentation' : item.type === 'youtube' ? 'YouTube' : 'Article',
      title: item.label,
      url: item.url,
      topic: group.label,
      source: item.source,
      duration: item.type === 'youtube' ? '12–20 min' : item.type === 'docs' ? '15 min' : '10 min',
      reason: weakness,
    }));
  }).filter((resource) => !seen.has(resource.url) && (seen.add(resource.url) || true)).slice(0, 5);
}
