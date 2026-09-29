export interface ResumeProfile {
  candidateName: string;
  targetTitle: string;
  experienceYears: number;
  summary: string;
  skills: string[];
  projects: {
    title: string;
    description: string;
    metrics?: string;
  }[];
  rawText: string;
}

export interface JobDescription {
  title: string;
  company: string;
  experienceRequiredYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  rawText: string;
}

export interface ResumeJDMatch {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  alignmentSummary: string;
  targetedQuestions: {
    stage: 'Background & Fit' | 'Technical Architecture' | 'Behavioral & STAR' | 'Gap Probing';
    question: string;
    context: string;
    expectedEvidence: string[];
  }[];
}
