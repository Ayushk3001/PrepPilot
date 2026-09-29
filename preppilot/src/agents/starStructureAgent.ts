export interface StarComponentAnalysis {
  status: 'strong' | 'detected' | 'weak' | 'missing';
  evidence: string | null;
  critique: string;
}

export interface StarAgentInput {
  candidateResponse: string;
  expectSTAR?: boolean;
}

export interface StarAgentOutput {
  structure_score: number; // 0-100
  starFilled: number; // 0-4
  situation: StarComponentAnalysis;
  task: StarComponentAnalysis;
  action: StarComponentAnalysis;
  result: StarComponentAnalysis;
  connectors_detected: string[];
  strengths: string[];
  improvements: string[];
}

const CONNECTOR_WORDS = [
  'first', 'firstly', 'to start', 'then', 'after that', 'next',
  'finally', 'in the end', 'as a result', 'so that', 'which meant',
  'leading to', 'subsequently', 'therefore', 'eventually'
];

export class StarStructureAgent {
  public static readonly agentName = "STAR Structure Agent";
  public static readonly id = "star";
  public static readonly prompt = `You are the STAR / Response Structure Agent.
Deconstruct the candidate's behavioral or situational response into Situation, Task, Action, and Result components.
Evaluate each on whether it is missing, weak, detected, or strong.
Extract verbatim quoted sentences from the candidate's response as empirical evidence.`;

  public static async execute(input: StarAgentInput): Promise<StarAgentOutput> {
    const text = input.candidateResponse.trim();
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const lower = text.toLowerCase();

    // Detect connectors
    const connectors_detected: string[] = [];
    for (const c of CONNECTOR_WORDS) {
      const re = new RegExp(`\\b${c}\\b`, 'gi');
      if (re.test(lower)) {
        connectors_detected.push(c);
      }
    }

    // 1. Situation: context, timeline, environment
    const sitRegex = /\b(when|while|at (my|the|our)|we were|our (team|system|company|service|client)|last (year|quarter)|during|initially|faced with)\b/i;
    const sitSentence = sentences.find(s => sitRegex.test(s));

    let situation: StarComponentAnalysis;
    if (sitSentence) {
      situation = {
        status: sitSentence.split(/\s+/).length >= 10 ? 'strong' : 'detected',
        evidence: sitSentence,
        critique: "Sets clear background context and business environment before introducing the problem."
      };
    } else {
      situation = {
        status: 'missing',
        evidence: null,
        critique: "No context-setting sentence found. State the company, project, or technical environment first."
      };
    }

    // 2. Task: responsibility, core problem, objective
    const taskRegex = /\b(responsible|my (role|task|job|responsibility)|needed to|had to|goal was|assigned to|was tasked with|objective was|needed a fix)\b/i;
    const taskSentence = sentences.find(s => taskRegex.test(s));

    let task: StarComponentAnalysis;
    if (taskSentence) {
      task = {
        status: taskSentence.includes("my") || taskSentence.includes("I ") ? 'strong' : 'detected',
        evidence: taskSentence,
        critique: "Clear demarcation of personal ownership and explicit challenge under pressure."
      };
    } else {
      task = {
        status: 'weak',
        evidence: sentences.length > 1 ? sentences[1] : null,
        critique: "Personal responsibility is implied rather than explicitly stated. Use 'My role was to...'."
      };
    }

    // 3. Action: first-person active engineering verbs
    const actionRegex = /\b(i led|i built|i designed|i architected|i owned|i implemented|i prototyped|i benchmarked|i refactored|i proposed|i traced|i resolved|i migrated|i shipped)\b/i;
    const actionSentence = sentences.find(s => actionRegex.test(s));
    const passiveActionRegex = /\b(we decided|we worked|we built|we did)\b/i;
    const passiveSentence = sentences.find(s => passiveActionRegex.test(s));

    let action: StarComponentAnalysis;
    if (actionSentence) {
      action = {
        status: 'strong',
        evidence: actionSentence,
        critique: "Strong active verbs highlighting personal technical initiative and execution."
      };
    } else if (passiveSentence) {
      action = {
        status: 'weak',
        evidence: passiveSentence,
        critique: "Uses collective 'we' instead of individual 'I'. Clarify your specific personal technical contribution."
      };
    } else {
      action = {
        status: 'missing',
        evidence: null,
        critique: "Missing concrete first-person actions taken to resolve the challenge."
      };
    }

    // 4. Result: metrics, outcome, impact, resolution
    const hasNumbers = /\b\d+(?:\.\d+)?%?\b/.test(lower);
    const resultRegex = /\b(result|impact|reduced|increased|improved|saved|dropped|lifted|grew|cut|eliminated|surged|delivered on time)\b/i;
    const resultSentence = sentences.find(s => resultRegex.test(s) || (hasNumbers && /\b(by|to|saving)\b/i.test(s)));

    let result: StarComponentAnalysis;
    if (resultSentence) {
      const hasQuantifier = /\b\d+%?|\$\d+|\d+\s*(?:ms|seconds|users|dollars)\b/i.test(resultSentence);
      result = {
        status: hasQuantifier ? 'strong' : 'detected',
        evidence: resultSentence,
        critique: hasQuantifier
          ? "Exemplary quantifiable result with verified empirical metric."
          : "Outcome stated qualitatively. Add specific percentages, latency gains, or business cost savings."
      };
    } else {
      result = {
        status: 'missing',
        evidence: null,
        critique: "Answer ends without a stated conclusion or measurable outcome. Always finish with what changed because of your action."
      };
    }

    // Count filled components
    const components = [situation, task, action, result];
    const starFilled = components.filter(c => c.status === 'detected' || c.status === 'strong').length;

    // Calculate structure score
    // A STAR score should not begin at a passing grade before any component is
    // evidenced. For non-STAR prompts, this still measures clear organization.
    let structure_score = input.expectSTAR ? 12 + (starFilled * 17) : 35 + (starFilled * 9);
    structure_score += Math.min(connectors_detected.length * 4, 12);
    if (situation.status === 'strong') structure_score += 3;
    if (action.status === 'strong') structure_score += 4;
    if (result.status === 'strong') structure_score += 5;
    if (sentences.length < 3) structure_score -= 15;

    structure_score = Math.max(0, Math.min(96, Math.round(structure_score)));

    // Strengths & Improvements
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (starFilled >= 3) {
      strengths.push(`${starFilled}/4 STAR elements present — narrative is easy for an interviewer to follow.`);
    }
    if (connectors_detected.length >= 2) {
      strengths.push(`Audible signposting: used transitions like '${connectors_detected.slice(0, 2).join("', '")}' to guide the listener.`);
    }
    if (result.status === 'strong') {
      strengths.push("High-impact conclusion: landed the story on a quantifiable result.");
    }

    if (result.status === 'missing' || result.status === 'weak') {
      improvements.push("Land every story on a quantified Result. What was the percentage improvement, time saved, or system stability gain?");
    }
    if (action.status === 'weak') {
      improvements.push("Shift from 'we' to 'I'. Interviewers evaluate your specific contribution, not what the team did in general.");
    }
    if (situation.status === 'missing') {
      improvements.push("Open with context: set the stage in 1–2 sentences before diving into the problem.");
    }
    if (connectors_detected.length === 0) {
      improvements.push("Add signposts ('First... then... which meant...') so your narrative structure is audible.");
    }

    return {
      structure_score,
      starFilled,
      situation,
      task,
      action,
      result,
      connectors_detected,
      strengths,
      improvements
    };
  }
}
