import { CandidateProfile } from '@/lib/api';
import { normalizeResumeProfile } from '@/lib/resumeParser';

export interface ResumeEvidenceItem {
  id: string;
  topic: string;
  category: 'experience' | 'project' | 'venture' | 'skill' | 'education' | 'achievement';
  role?: string;
  organization?: string;
  facts: string[];
  skills: string[];
  technologies: string[];
  metrics: string[];
  responsibilities: string[];
  achievements: string[];
  potentialCompetencies: string[];
  source: 'resume';
  covered: boolean;
  timesExplored: number;
}

export interface ResumeKnowledgeModel {
  candidate: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    targetRole?: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    year: string;
    achievements?: string[];
  }>;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    responsibilities?: string[];
    technologies?: string[];
    achievements?: string[];
    metrics?: string[];
    summary?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies?: string[];
    metrics?: string[];
    contribution?: string;
    architecture?: string;
    results?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    technologies: string[];
    domains: string[];
  };
  certifications: string[];
  achievements: string[];
  organizations: Array<{
    name: string;
    role: string;
    productOrService?: string;
    metrics?: string[];
    responsibilities?: string[];
  }>;
  evidenceGraph: ResumeEvidenceItem[];
  rawText?: string;
}

export type InterviewRoundKey =
  | 'hr'
  | 'behavioral'
  | 'technical'
  | 'situational'
  | 'leadership'
  | 'mock';

export interface RoundDefinition {
  key: InterviewRoundKey;
  name: string;
  description: string;
  coreQuestionCount: number;
  maxFollowUpsPerQuestion: number;
  primaryCompetencies: string[];
  estimatedDuration: string;
  maxTotalQuestions: number;
  durationMinutes: number;
}

export const INTERVIEW_ROUNDS: Record<InterviewRoundKey, RoundDefinition> = {
  hr: {
    key: 'hr',
    name: 'Round 1 — HR & Introduction',
    description: 'Career journey, background walkthrough, motivation, and role fit grounded in your resume.',
    coreQuestionCount: 3,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['Communication', 'Career Motivation', 'Resume Overview', 'Cultural Fit'],
    estimatedDuration: '10–15 mins',
    maxTotalQuestions: 5,
    durationMinutes: 15,
  },
  behavioral: {
    key: 'behavioral',
    name: 'Round 2 — Behavioral & STAR',
    description: 'Real challenges, adversity, failure, and teamwork deconstructed through your actual past projects.',
    coreQuestionCount: 5,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['STAR Structure', 'Conflict Resolution', 'Overcoming Failure', 'Collaboration'],
    estimatedDuration: '20–25 mins',
    maxTotalQuestions: 6,
    durationMinutes: 25,
  },
  technical: {
    key: 'technical',
    name: 'Round 3 — Technical & Domain Knowledge',
    description: 'Rigorous exploration of technologies, architecture, and implementations listed on your resume.',
    coreQuestionCount: 6,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['Technical Depth', 'Architecture Trade-offs', 'Tech Stack Mastery', 'Problem Solving'],
    estimatedDuration: '25–30 mins',
    maxTotalQuestions: 8,
    durationMinutes: 30,
  },
  situational: {
    key: 'situational',
    name: 'Round 4 — Situational & Problem Solving',
    description: 'Realistic scenarios calibrated to your past startup/company background and operational adversity.',
    coreQuestionCount: 5,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['Critical Thinking', 'Crisis Management', 'Product Decision-Making', 'Root Cause Analysis'],
    estimatedDuration: '20–25 mins',
    maxTotalQuestions: 7,
    durationMinutes: 25,
  },
  leadership: {
    key: 'leadership',
    name: 'Round 5 — Leadership & Ownership',
    description: 'Probing leadership indicators, initiative, founding decisions, and unassigned ownership.',
    coreQuestionCount: 4,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['Extreme Ownership', 'Decision Under Uncertainty', 'Stakeholder Influence', 'Vision'],
    estimatedDuration: '15–20 mins',
    maxTotalQuestions: 6,
    durationMinutes: 20,
  },
  mock: {
    key: 'mock',
    name: 'Round 6 — Full Comprehensive Mock',
    description: 'Focused end-to-end interview across all five dimensions.',
    coreQuestionCount: 6,
    maxFollowUpsPerQuestion: 1,
    primaryCompetencies: ['HR (2)', 'Behavioral (4)', 'Technical (4)', 'Situational (2)', 'Leadership (2)', 'Role Alignment (1)'],
    estimatedDuration: '25–30 mins',
    maxTotalQuestions: 9,
    durationMinutes: 30,
  },
};

/**
 * Extracts and maps any CandidateProfile into a structured ResumeEvidenceGraph.
 */
export function buildEvidenceGraph(profile: CandidateProfile): ResumeEvidenceItem[] {
  const items: ResumeEvidenceItem[] = [];
  const techSkills = profile.technicalSkills || profile.technical_skills || [];
  const technologies = profile.technologies || techSkills;

  // 1. Experiences & Ventures
  const experiences = profile.workExperience || profile.experience || [];
  experiences.forEach((exp, idx) => {
    const isVenture = /\b(founder|co-founder|owner|partner|creator)\b/i.test(exp.role) ||
                      /\b(startup|stealth|venture)\b/i.test(exp.summary || '');
    
    // Extract metrics if present
    const metrics: string[] = [];
    const metricMatches = (exp.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|M|cr|L|Lakhs?|orders?|revenue)?|\₹[\d,.]+(?:L|Cr|k)?|\$[\d,.]+(?:k|M)?)\b/gi);
    if (metricMatches) metrics.push(...metricMatches);
    if (Array.isArray(exp.metrics)) {
      exp.metrics.forEach(m => {
        if (!metrics.includes(m)) metrics.push(m);
      });
    }

    // Extract facts
    const facts = [
      `Held title of ${exp.role} at ${exp.company} (${exp.duration})`,
      ...(exp.summary ? [exp.summary] : [])
    ];

    items.push({
      id: `exp_${idx}_${exp.company.toLowerCase().replace(/\W+/g, '_')}`,
      topic: exp.company,
      category: isVenture ? 'venture' : 'experience',
      role: exp.role,
      organization: exp.company,
      facts,
      skills: techSkills.slice(0, 3),
      technologies: technologies.filter(t => (exp.summary || '').toLowerCase().includes(t.toLowerCase())),
      metrics,
      responsibilities: [exp.role, `Ownership at ${exp.company}`],
      achievements: metrics.length > 0 ? [`Achieved ${metrics.join(', ')} at ${exp.company}`] : [],
      potentialCompetencies: isVenture 
        ? ['Leadership', 'Ownership', 'Product', 'Growth', 'Problem Solving', 'Decision Making']
        : ['Technical Depth', 'Teamwork', 'Execution', 'STAR Structure'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  });

  // 2. Internships
  (profile.internships || []).forEach((intern, idx) => {
    const metrics: string[] = [];
    const metricMatches = (intern.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|M|cr|L|Lakhs?|orders?|revenue)?|\₹[\d,.]+(?:L|Cr|k)?|\$[\d,.]+(?:k|M)?)\b/gi);
    if (metricMatches) metrics.push(...metricMatches);

    const facts = [
      `Completed internship: ${intern.role} at ${intern.company} (${intern.duration})`,
      ...(intern.summary ? [intern.summary] : [])
    ];

    items.push({
      id: `intern_${idx}_${intern.company.toLowerCase().replace(/\W+/g, '_')}`,
      topic: intern.company,
      category: 'experience',
      role: intern.role || 'Intern',
      organization: intern.company,
      facts,
      skills: techSkills.slice(0, 3),
      technologies: technologies.filter(t => (intern.summary || '').toLowerCase().includes(t.toLowerCase())),
      metrics,
      responsibilities: [intern.role || 'Intern', `Internship at ${intern.company}`],
      achievements: metrics.length > 0 ? [`Achieved ${metrics.join(', ')} at ${intern.company}`] : [],
      potentialCompetencies: ['Technical Depth', 'Fast Learning', 'Execution', 'Collaboration'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  });

  // 3. Projects
  (profile.projects || []).forEach((proj, idx) => {
    const metrics: string[] = [];
    const metricMatches = (proj.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|ms|s|SLA)?|\₹[\d,.]+|\$[\d,.]+)\b/gi);
    if (metricMatches) metrics.push(...metricMatches);
    if (Array.isArray(proj.metrics)) {
      proj.metrics.forEach(m => {
        if (!metrics.includes(m)) metrics.push(m);
      });
    }

    const facts = [
      `Engineered project: ${proj.name}`,
      proj.summary
    ];

    items.push({
      id: `proj_${idx}_${proj.name.toLowerCase().replace(/\W+/g, '_')}`,
      topic: proj.name,
      category: 'project',
      role: 'Project Lead / Author',
      organization: 'Independent / University / Enterprise',
      facts,
      skills: techSkills.slice(0, 3),
      technologies: technologies.filter(t => (proj.summary || '').toLowerCase().includes(t.toLowerCase())),
      metrics,
      responsibilities: [`Architected and implemented ${proj.name}`],
      achievements: metrics.length > 0 ? [`Delivered metrics: ${metrics.join(', ')}`] : [],
      potentialCompetencies: ['Technical Depth', 'System Design', 'Architecture Trade-offs', 'Problem Solving'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  });

  // 4. Education
  (profile.education || []).forEach((edu, idx) => {
    const facts = [
      `Studied at ${edu.institution}: ${edu.degree} (${edu.year || 'Completed'})`,
      ...(edu.grade ? [`Academic performance: ${edu.grade}`] : [])
    ];

    items.push({
      id: `edu_${idx}_${edu.institution.toLowerCase().replace(/\W+/g, '_')}`,
      topic: edu.institution,
      category: 'education',
      role: 'Graduate / Student',
      organization: edu.institution,
      facts,
      skills: techSkills.slice(0, 2),
      technologies: [],
      metrics: edu.grade ? [edu.grade] : [],
      responsibilities: [`Academic excellence at ${edu.institution}`],
      achievements: edu.grade ? [`Attained ${edu.grade}`] : [],
      potentialCompetencies: ['Foundational Knowledge', 'Computer Science Fundamentals', 'Academic Rigor'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  });

  // 5. Technical Skills clusters
  if (techSkills.length > 0) {
    items.push({
      id: `skills_tech_core`,
      topic: 'Core Technical Stack',
      category: 'skill',
      facts: [`Primary technical capabilities: ${techSkills.join(', ')}`],
      skills: techSkills,
      technologies,
      metrics: [],
      responsibilities: ['Technical implementation and architecture'],
      achievements: [],
      potentialCompetencies: ['Technical Depth', 'Tooling Mastery', 'Role Knowledge'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  }

  // 6. Certifications & Achievements
  if (profile.achievements && profile.achievements.length > 0) {
    items.push({
      id: `achieve_core`,
      topic: profile.achievements[0],
      category: 'achievement',
      facts: profile.achievements,
      skills: [],
      technologies: [],
      metrics: [],
      responsibilities: ['Competitive excellence'],
      achievements: profile.achievements,
      potentialCompetencies: ['Excellence', 'Ownership', 'Motivation'],
      source: 'resume',
      covered: false,
      timesExplored: 0,
    });
  }

  return items;
}

/**
 * Builds the complete ResumeKnowledgeModel from CandidateProfile.
 */
export function extractResumeKnowledge(profile: CandidateProfile, rawText?: string): ResumeKnowledgeModel {
  const evidenceGraph = buildEvidenceGraph(profile);
  const experiences = profile.workExperience || profile.experience || [];
  const techSkills = profile.technicalSkills || profile.technical_skills || [];
  const softSkills = profile.softSkills || profile.soft_skills || [];
  const technologies = profile.technologies || techSkills;

  const ventures = experiences.filter(exp => 
    /\b(founder|co-founder|owner|partner|creator)\b/i.test(exp.role)
  ).map(exp => ({
    name: exp.company,
    role: exp.role,
    productOrService: exp.summary || 'Platform & Operations',
    responsibilities: [exp.role, 'Product & Growth'],
    metrics: (exp.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|M|cr|L|Lakhs?|orders?|revenue)?|\₹[\d,.]+(?:L|Cr|k)?|\$[\d,.]+(?:k|M)?)\b/gi) || []
  }));

  const candidateName = profile.basics?.fullName || profile.name || 'Candidate';
  const candidateEmail = profile.basics?.email || profile.email || '';
  const candidatePhone = profile.basics?.phone || profile.phone || '';
  const candidateLocation = profile.basics?.location || profile.location || '';
  const candidateSummary = profile.basics?.summary || profile.summary || '';

  return {
    candidate: {
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      location: candidateLocation,
      summary: candidateSummary,
    },
    education: (profile.education || []).map(e => ({
      institution: e.institution,
      degree: e.degree,
      year: e.year,
    })),
    experience: experiences.map(exp => ({
      company: exp.company,
      role: exp.role,
      duration: exp.duration,
      summary: exp.summary,
      responsibilities: [exp.role],
      technologies: technologies.filter(t => (exp.summary || '').toLowerCase().includes(t.toLowerCase())),
      metrics: (exp.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|M|cr|L|Lakhs?|orders?|revenue)?|\₹[\d,.]+(?:L|Cr|k)?|\$[\d,.]+(?:k|M)?)\b/gi) || [],
    })),
    projects: (profile.projects || []).map(p => ({
      name: p.name,
      description: p.summary,
      technologies: technologies.filter(t => (p.summary || '').toLowerCase().includes(t.toLowerCase())),
      metrics: (p.summary || '').match(/\b(\d+[\d,.]*(?:\+|%|k|ms|s|SLA)?|\₹[\d,.]+|\$[\d,.]+)\b/gi) || [],
    })),
    skills: {
      technical: techSkills,
      soft: softSkills,
      technologies,
      domains: profile.domains || [],
    },
    certifications: profile.certifications || [],
    achievements: profile.achievements || [],
    organizations: ventures,
    evidenceGraph,
    rawText: rawText || candidateSummary,
  };
}

/**
 * Candidate Resume Presets (Clean production state: empty so user's uploaded resume is the sole source of truth)
 */
export const VERIFIED_RESUME_PRESETS: Array<{
  id: string;
  title: string;
  badge: string;
  role: string;
  profile: CandidateProfile;
  previewHighlights: string[];
}> = [];
