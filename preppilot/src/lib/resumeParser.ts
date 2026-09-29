// @ts-nocheck
import { ResumeProfile, JobDescription, ResumeJDMatch } from '@/types/resume';
import { CandidateProfile } from '@/lib/api';

export const TECH_SKILLS_DICTIONARY = [
  'Python', 'FastAPI', 'Django', 'Flask', 'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Microservices', 'GraphQL', 'REST APIs', 'System Design', 'CI/CD', 'GitHub Actions', 'Terraform',
  '5G Standalone', 'OSS/BSS', 'TMF Open APIs', 'eBPF', 'Telecom Network', 'Service Mesh', 'Istio',
  'Machine Learning', 'PyTorch', 'TensorFlow', 'LLMs', 'Prompt Engineering', 'LangChain', 'Multi-Agent Systems',
  'SQL', 'Pandas', 'Data Modeling', 'ETL Pipelines', 'Snowflake', 'BigQuery', 'Apache Spark', 'Scikit-learn',
  'Go', 'Golang', 'Rust', 'Java', 'Spring Boot', 'C++', 'C#', '.NET', 'HTML', 'CSS', 'Tailwind CSS',
  'Vector DB', 'Pinecone', 'Qdrant', 'Chroma', 'Weaviate', 'LlamaIndex', 'RAG', 'Computer Vision', 'NLP',
  'Git', 'Linux', 'Bash', 'Nginx', 'WebSockets', 'gRPC', 'Celery', 'DynamoDB', 'Elasticsearch', 'OpenSearch',
  'Hugging Face', 'Transformers', 'Fine-tuning', 'Shopify', 'Mixpanel', 'Figma'
];

export const SOFT_SKILLS_DICTIONARY = [
  'Extreme Ownership', 'Technical Signposting', 'Stakeholder Alignment', 'Cross-Functional Collaboration',
  'Leadership', 'Problem Solving', 'First-Principles Thinking', 'Critical Thinking', 'Mentorship',
  'STAR Communication', 'Customer Empathy', 'Executive Presentation', 'Agile Delivery', 'Conflict Resolution',
  'Strategic Thinking', 'Decision Making', 'Continuous Learning', 'Adaptability', 'Growth Mindset'
];

export const SAMPLE_PRESETS: {
  id: string;
  name: string;
  role: string;
  resume: ResumeProfile;
  jd: JobDescription;
}[] = [];

export function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return TECH_SKILLS_DICTIONARY.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(lower);
  });
}

export function extractSoftSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  return SOFT_SKILLS_DICTIONARY.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(lower);
  });
}

export function inferDomainsFromText(text: string, skills: string[]): string[] {
  const lower = text.toLowerCase();
  const domains: string[] = [];

  if (/\b(telecom|telecommunication|oss|bss|5g|ran|core network|routing|bgp|dsp)\b/i.test(lower)) {
    domains.push('Telecommunications (OSS/BSS)');
  }
  if (/\b(commerce|quick-commerce|e-commerce|checkout|shopify|cart|retail|delivery|shiprocket)\b/i.test(lower)) {
    domains.push('Quick-Commerce & E-Commerce');
  }
  if (/\b(llm|large language|genai|generative ai|prompt|multi-agent|vector|embedding|rag|nlp|vision|pytorch|tensorflow)\b/i.test(lower)) {
    domains.push('Artificial Intelligence & ML');
  }
  if (/\b(cloud|kubernetes|docker|k8s|aws|gcp|azure|devops|ci\/cd|terraform|microservices)\b/i.test(lower)) {
    domains.push('Cloud Infrastructure & DevOps');
  }
  if (/\b(payment|fintech|banking|stripe|transaction|ledger|accounting|trading)\b/i.test(lower)) {
    domains.push('FinTech & Payments');
  }
  if (/\b(distributed|kafka|concurrency|latency|throughput|event-driven|high-throughput)\b/i.test(lower)) {
    domains.push('Distributed Systems');
  }
  if (/\b(saas|enterprise|b2b|crm|workflow|automation)\b/i.test(lower)) {
    domains.push('Enterprise SaaS');
  }

  if (domains.length === 0) {
    domains.push('Software Engineering & Technology');
  }

  return Array.from(new Set(domains));
}

/**
 * Normalizes any parsed JSON output into the canonical CandidateProfile schema per Section 7 & 8.
 * Handles variations in property names (camelCase, snake_case, nested basics, legacy objects).
 */
export function normalizeResumeProfile(rawParsed: any, userAccount?: { name?: string; email?: string }): CandidateProfile {
  if (!rawParsed || typeof rawParsed !== 'object') {
    const accName = userAccount?.name && userAccount.name !== 'Candidate' ? userAccount.name : '';
    const accEmail = userAccount?.email && !userAccount.email.includes('example.com') ? userAccount.email : '';
    return {
      basics: {
        fullName: accName,
        email: accEmail,
        phone: '',
        location: '',
        summary: '',
      },
      education: [],
      workExperience: [],
      internships: [],
      projects: [],
      technicalSkills: [],
      softSkills: [],
      technologies: [],
      certifications: [],
      achievements: [],
      domains: [],
      name: accName,
      email: accEmail,
      phone: '',
      location: '',
      summary: '',
      experience: [],
      technical_skills: [],
      soft_skills: [],
    };
  }

  // 1. Basics & Contact (Explicit field mapping per Section 8)
  const rawBasics = rawParsed.basics || {};
  let extractedName = (
    rawBasics.fullName ||
    rawBasics.name ||
    rawParsed.fullName ||
    rawParsed.candidateName ||
    rawParsed.name ||
    ''
  ).trim();

  // Precedence rule per Section 13:
  // Verified extracted name > Account name > empty (NEVER force 'Candidate' if real name exists)
  let name = '';
  if (extractedName && extractedName.toLowerCase() !== 'candidate') {
    name = extractedName;
  } else if (userAccount?.name && userAccount.name.toLowerCase() !== 'candidate') {
    name = userAccount.name;
  } else {
    name = extractedName || userAccount?.name || '';
  }

  let extractedEmail = (rawBasics.email || rawParsed.email || '').trim();
  let email = '';
  if (extractedEmail) {
    email = extractedEmail;
  } else if (userAccount?.email && !userAccount.email.includes('example.com')) {
    email = userAccount.email;
  } else {
    email = extractedEmail || userAccount?.email || '';
  }

  let phone = (rawBasics.phone || rawParsed.phone || '').trim();
  let location = (rawBasics.location || rawParsed.location || '').trim();
  let summary = (rawBasics.summary || rawParsed.summary || rawParsed.profileSummary || rawParsed.about || '').trim();

  // 2. Education (Explicit field mapping per Section 8)
  const rawEdu = rawParsed.education || rawParsed.academics || rawParsed.academicBackground || [];
  const education = (Array.isArray(rawEdu) ? rawEdu : []).map((it: any) => {
    if (typeof it === 'string') return { institution: it, degree: 'Degree', year: '' };
    const inst = (it.institution || it.school || it.university || it.college || '').trim();
    let deg = (it.degree || it.degreeName || it.qualification || '').trim();
    const field = (it.field || it.specialization || it.major || '').trim();
    if (field && !deg.toLowerCase().includes(field.toLowerCase())) {
      deg = deg ? `${deg} in ${field}` : field;
    }
    const year = (it.year || it.duration || it.years || (it.startDate && it.endDate ? `${it.startDate} – ${it.endDate}` : it.endDate || '')).trim();
    const grade = (it.grade || it.cgpa || it.percentage || '').trim();
    const achievements = Array.isArray(it.achievements) ? it.achievements : [];
    return {
      institution: inst || 'University / Institution',
      degree: deg || 'Degree',
      field,
      year: year || '',
      startDate: it.startDate || '',
      endDate: it.endDate || '',
      grade,
      achievements,
    };
  }).filter((e: any) => e.institution || e.degree);

  // 3. Work Experience & Internships (Explicit mapping per Section 8: work_experience -> workExperience)
  const rawExp = rawParsed.workExperience || rawParsed.work_experience || rawParsed.experience || rawParsed.employment || [];
  const rawInternships = rawParsed.internships || rawParsed.internshipExperience || [];

  const allExp = (Array.isArray(rawExp) ? rawExp : []).map((it: any) => {
    if (typeof it === 'string') return { company: it, role: 'Software Engineer', duration: '', summary: '' };
    const comp = (it.company || it.organization || it.employer || '').trim();
    const role = (it.role || it.title || it.jobTitle || it.position || '').trim();
    const duration = (it.duration || it.dates || (it.startDate && it.endDate ? `${it.startDate} – ${it.endDate}` : it.endDate || '')).trim();
    let sum = (it.summary || it.description || '').trim();
    const responsibilities = Array.isArray(it.responsibilities) ? it.responsibilities : [];
    if (!sum && responsibilities.length > 0) {
      sum = responsibilities.join(' ').trim();
    }
    const achievements = Array.isArray(it.achievements) ? it.achievements : [];
    const technologies = Array.isArray(it.technologies) ? it.technologies : [];
    const metrics = Array.isArray(it.metrics) ? it.metrics : [];

    return {
      company: comp || 'Company',
      role: role || 'Engineer',
      startDate: it.startDate || '',
      endDate: it.endDate || '',
      duration: duration || '',
      summary: sum,
      responsibilities,
      achievements,
      technologies,
      metrics,
    };
  }).filter((e: any) => e.company || e.role);

  const directInternships = (Array.isArray(rawInternships) ? rawInternships : []).map((it: any) => {
    if (typeof it === 'string') return { company: it, role: 'Intern', duration: '', summary: '' };
    const comp = (it.company || it.organization || '').trim();
    const role = (it.role || it.title || 'Intern').trim();
    const duration = (it.duration || it.dates || '').trim();
    let sum = (it.summary || it.description || '').trim();
    const responsibilities = Array.isArray(it.responsibilities) ? it.responsibilities : [];
    if (!sum && responsibilities.length > 0) {
      sum = responsibilities.join(' ').trim();
    }
    return {
      company: comp || 'Company',
      role,
      duration,
      summary: sum,
      responsibilities,
      achievements: Array.isArray(it.achievements) ? it.achievements : [],
      technologies: Array.isArray(it.technologies) ? it.technologies : [],
      metrics: Array.isArray(it.metrics) ? it.metrics : [],
    };
  }).filter((e: any) => e.company || e.role);

  // If internships array is empty, separate out experience items that clearly designate an internship
  const workExperience: any[] = [];
  const internships = [...directInternships];

  allExp.forEach((item: any) => {
    if (internships.length === 0 && /\b(intern|internship)\b/i.test(item.role)) {
      internships.push(item);
    } else {
      workExperience.push(item);
    }
  });

  // 4. Projects
  const rawProjects = rawParsed.projects || rawParsed.keyProjects || [];
  const projects = (Array.isArray(rawProjects) ? rawProjects : []).map((it: any) => {
    if (typeof it === 'string') return { name: it, summary: '' };
    const name = (it.name || it.title || it.projectName || '').trim();
    let sum = (it.summary || it.description || '').trim();
    if (it.metrics && typeof it.metrics === 'string' && !sum.includes(it.metrics)) {
      sum = sum ? `${sum} (${it.metrics})` : it.metrics;
    }
    return {
      name,
      summary: sum,
      description: it.description || sum,
      contribution: it.contribution || '',
      technologies: Array.isArray(it.technologies) ? it.technologies : [],
      results: it.results || '',
      metrics: Array.isArray(it.metrics) ? it.metrics : (it.metrics ? [String(it.metrics)] : []),
    };
  }).filter((p: any) => p.name || p.summary);

  // 5. Skills & Tech (Explicit mapping: technical_skills -> technicalSkills)
  const toStringArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map((x: any) => (typeof x === 'string' ? x : x?.name || String(x))).map(s => s.trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
      return val.split(/[,;|•·\n]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const rawTechSkills = rawParsed.technicalSkills || rawParsed.technical_skills || rawParsed.skills?.technical || rawParsed.skills || [];
  const technicalSkills = Array.from(new Set(toStringArray(rawTechSkills)));

  const rawSoftSkills = rawParsed.softSkills || rawParsed.soft_skills || rawParsed.skills?.soft || [];
  const softSkills = Array.from(new Set(toStringArray(rawSoftSkills)));

  const rawTech = rawParsed.technologies || rawParsed.tools || rawParsed.skills?.technologies || technicalSkills;
  const technologies = Array.from(new Set(toStringArray(rawTech)));

  // 6. Certifications
  const rawCerts = rawParsed.certifications || rawParsed.licenses || [];
  const certifications = (Array.isArray(rawCerts) ? rawCerts : []).map((it: any) => {
    if (typeof it === 'string') return it.trim();
    if (it.name) return it.organization ? `${it.name} (${it.organization})` : it.name;
    return String(it);
  }).filter(Boolean);

  // 7. Achievements
  const rawAchieve = rawParsed.achievements || rawParsed.awards || rawParsed.honors || [];
  const achievements = (Array.isArray(rawAchieve) ? rawAchieve : []).map((it: any) => {
    if (typeof it === 'string') return it.trim();
    if (it.title || it.name) return (it.title || it.name) + (it.description ? `: ${it.description}` : '');
    return String(it);
  }).filter(Boolean);

  // 8. Domains (Explicit mapping: domain_experience -> domains)
  const rawDomains = rawParsed.domains || rawParsed.domainExperience || rawParsed.domain_experience || rawParsed.industries || [];
  const domains = Array.from(new Set(toStringArray(rawDomains)));

  const finalTechSkills = technicalSkills.length > 0 ? technicalSkills : technologies;

  return {
    // Canonical Section 7 Schema
    basics: {
      fullName: name,
      email,
      phone,
      location,
      summary,
    },
    education,
    workExperience,
    internships,
    projects,
    technicalSkills: finalTechSkills,
    softSkills,
    technologies: technologies.length > 0 ? technologies : finalTechSkills,
    certifications,
    achievements,
    domains: domains.length > 0 ? domains : ['Software Engineering', 'Technology'],

    // Backward compatibility aliases
    name,
    email,
    phone,
    location,
    summary,
    experience: workExperience,
    technical_skills: finalTechSkills,
    soft_skills: softSkills,
  };
}

/**
 * Detects if a profile was created from corrupt raw binary/PDF stream data
 */
export function isCorruptOrGarbageProfile(profile: any): boolean {
  if (!profile) return false;
  const name = String(profile.name || profile.basics?.fullName || '').trim().toLowerCase();
  if (
    name.includes('flatedecode') ||
    name.includes('filter') ||
    name.includes('pdf-') ||
    name.includes('stream') ||
    name.includes('endobj') ||
    name.includes('\ufffd') ||
    /[\x00-\x08\x0E-\x1F]/.test(name)
  ) {
    return true;
  }

  const allStr = JSON.stringify(profile).toLowerCase();
  if (allStr.includes('flatedecode') || allStr.includes('\ufffd')) {
    return true;
  }

  return false;
}

/**
 * Robust, deterministic section-aware resume parser.
 * Works completely offline without requiring LLM calls.
 * Extracts contact, summary, education, experience, internships, projects, skills, certifications, and achievements.
 */
export function parseResumeText(rawText: string, fallbackPreset?: any, userAccount?: { name?: string; email?: string }): CandidateProfile & ResumeProfile {
  if (!rawText || !rawText.trim()) {
    if (fallbackPreset) return fallbackPreset;
    return normalizeResumeProfile({}, userAccount) as any;
  }

  // Guard against raw binary PDF streams or unparsed bytecode
  if (
    rawText.includes('%PDF-') ||
    rawText.includes('/Filter /FlateDecode') ||
    rawText.includes('FlateDecode') ||
    rawText.includes('/Length ') ||
    rawText.includes('\uFFFD') ||
    /[\x00-\x08\x0E-\x1F]/.test(rawText.slice(0, 500))
  ) {
    console.warn('[parseResumeText] Binary/PDF stream passed to text parser. Rejecting binary input.');
    return normalizeResumeProfile({}, userAccount) as any;
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Contact details extraction
  const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0].trim() : (userAccount?.email || '');

  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-\s.]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // Location search in top 12 lines
  let location = '';
  for (const line of lines.slice(0, 12)) {
    const parts = line.split(/[|•·;]/).map(p => p.trim());
    for (const p of parts) {
      if (/,/.test(p) && !p.includes('@') && !p.includes('http') && !/^\+?\d/.test(p) && p.length < 50) {
        location = p.replace(/[()[\]{}]/g, '').trim();
        break;
      }
    }
    if (location) break;
  }

  const INVALID_NAME_TERMS = /^(?:filter|flatedecode|flatedecodelength|length|stream|endstream|xref|trailer|startxref|obj|endobj|page|catalog|pages|font|type|mediabox|resources|root|info|id)\b/i;

  // Name extraction (first valid non-meta segment or line in top 10 lines)
  let candidateName = '';
  for (const line of lines.slice(0, 10)) {
    if (/^(resume|curriculum vitae|cv|page\s*\d+)$/i.test(line.trim())) continue;
    if (INVALID_NAME_TERMS.test(line.trim())) continue;

    // Strategy 1: Check individual segments if delimited by |, •, ·, ;, or tab
    const segments = line.split(/[|•·;\t]/).map(s => s.trim()).filter(Boolean);
    for (const seg of segments) {
      if (!seg.includes('@') && !seg.includes('http') && !/\d/.test(seg)) {
        const clean = seg.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const words = clean.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && words.length <= 4 && clean.length >= 3 && clean.length <= 35) {
          if (!/^(software engineer|curriculum vitae|contact information|personal details|about me|work experience|education details|projects|technical skills)$/i.test(clean) && !INVALID_NAME_TERMS.test(clean)) {
            candidateName = clean;
            break;
          }
        }
      }
    }
    if (candidateName) break;

    // Strategy 2: If line has contact info (email/phone) directly inline, extract leading name
    const withoutContact = line
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '')
      .replace(/(?:\+?\d{1,3}[-\s.]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}/g, '')
      .replace(/https?:\/\/\S+|www\.\S+|linkedin\.com\S+|github\.com\S+/g, '')
      .replace(/[|•·;,\-–]/g, ' ')
      .trim();

    const leadingWords = withoutContact.split(/\s+/).filter(Boolean);
    if (leadingWords.length >= 2) {
      const candidateCand = leadingWords.slice(0, Math.min(leadingWords.length, 3)).join(' ');
      if (/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2}$/.test(candidateCand)) {
        candidateName = candidateCand;
        break;
      }
    }
  }

  // Strategy 3: Check before email in rawText if name still not found
  if (!candidateName && emailMatch && emailMatch.index !== undefined && emailMatch.index > 2) {
    const beforeEmail = rawText.slice(0, emailMatch.index)
      .replace(/^(resume|curriculum vitae|cv)\s*/i, '')
      .replace(/[|•·;,\-–\n\r]/g, ' ')
      .trim();
    const words = beforeEmail.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const candidateCand = words.slice(0, Math.min(words.length, 3)).join(' ');
      if (/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,2}$/.test(candidateCand)) {
        candidateName = candidateCand;
      }
    }
  }

  if (!candidateName) {
    candidateName = userAccount?.name && userAccount.name.toLowerCase() !== 'candidate' ? userAccount.name : '';
  }

  // 2. Section Partitioning
  const sections: Record<string, string[]> = {
    summary: [],
    experience: [],
    internships: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    achievements: [],
    other: []
  };

  const SECTION_HEADERS: Array<{ key: string; regex: RegExp }> = [
    { key: 'summary', regex: /^(?:professional\s+|executive\s+)?(?:summary|profile|about(?:\s+me)?|objective)\b/i },
    { key: 'experience', regex: /^(?:work\s+|professional\s+|employment\s+|career\s+)?(?:experience|history|employment)\b/i },
    { key: 'internships', regex: /^(?:internship|internships|internship\s+experience)\b/i },
    { key: 'education', regex: /^(?:education|academic\s+background|academics|qualifications)\b/i },
    { key: 'projects', regex: /^(?:projects|key\s+projects|personal\s+projects|academic\s+projects)\b/i },
    { key: 'skills', regex: /^(?:technical\s+|core\s+)?(?:skills|competencies|technologies|tools|expertise)\b/i },
    { key: 'certifications', regex: /^(?:certifications|licenses|credentials|courses)\b/i },
    { key: 'achievements', regex: /^(?:achievements|awards|honors|accomplishments|publications)\b/i },
  ];

  let currentKey = 'header';
  for (const line of lines) {
    const cleanLine = line.replace(/[:#*_\-]/g, '').trim();
    if (cleanLine.length > 2 && cleanLine.length < 45) {
      const match = SECTION_HEADERS.find(h => h.regex.test(cleanLine));
      if (match) {
        currentKey = match.key;
        continue;
      }
    }
    if (currentKey !== 'header' && sections[currentKey]) {
      sections[currentKey].push(line);
    }
  }

  // 3. Parse Summary
  let summary = sections.summary.slice(0, 5).join(' ').trim();
  if (!summary) {
    const topLines = lines.slice(2, 6).filter(l => !l.includes('@') && !l.includes('http') && !/^\+?\d/.test(l));
    summary = topLines.join(' ').slice(0, 280);
  }

  // Helper date / role detectors
  const isDateLine = (l: string) =>
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\b|\b(?:20\d\d|19\d\d)\s*[-–to\s]+(?:\d{4}|present|current)\b|\b(?:20\d\d|19\d\d)\b/i.test(l);

  const isRoleLine = (l: string) => {
    const clean = l.trim();
    if (clean.length > 70 || clean.split(/\s+/).length > 8) return false;
    if (/\b(backend|services|testing|deploying|completing|architected|implemented|built|engineered|managed|directed|spearheaded|collaborative|practiced)\b/i.test(clean)) return false;
    return /\b(engineer|developer|lead|founder|co-founder|manager|architect|analyst|intern|internship|director|consultant|specialist|officer|head|associate|designer|programmer|creator|owner|trainee)\b/i.test(clean);
  };

  const isDegreeLine = (l: string) =>
    /\b(b\.?tech|b\.?e\.?|b\.?s\.?|bachelor|master|m\.?tech|m\.?s\.?|mba|ph\.?d|diploma|associate|bca|mca|bba|b\.sc|m\.sc)\b/i.test(l);

  // 4. Parse Education with multi-line support
  const education: Array<{ institution: string; degree: string; year: string; grade?: string }> = [];
  if (sections.education.length > 0) {
    let i = 0;
    const eduLines = sections.education;
    while (i < eduLines.length) {
      const line = eduLines[i].trim();
      if (!line) { i++; continue; }

      let inst = '';
      let deg = '';
      let yr = '';
      let grade = '';

      if (line.includes('—') || line.includes(' – ')) {
        const sep = line.includes('—') ? '—' : ' – ';
        const parts = line.split(sep).map(p => p.trim());
        const p0 = parts[0];
        const p1 = parts[1];
        if (isDegreeLine(p0)) {
          deg = p0;
          const sub = p1.split(/[|]/).map(p => p.trim());
          inst = sub[0].replace(/\b(?:20\d\d|19\d\d)\s*[-–to\s]+(?:\d{4}|present|current)\b|\b\d{4}\b/gi, '').trim();
          const yrMatch = sub[0].match(/\b(?:20\d\d|19\d\d)\s*[-–to\s]+(?:\d{4}|present|current)\b|\b\d{4}\b/i);
          if (yrMatch) yr = yrMatch[0];
        } else {
          inst = p0;
          deg = p1;
        }
        i++;
      } else if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        inst = parts[0];
        deg = parts[1] || 'Degree';
        if (parts[2]) {
          if (/cgpa|gpa|%|grade|marks/i.test(parts[2])) grade = parts[2];
          else yr = parts[2];
        }
        i++;
      } else if (isDegreeLine(line)) {
        deg = line;
        i++;
      } else if (i + 1 < eduLines.length && isDegreeLine(eduLines[i + 1])) {
        inst = line;
        deg = eduLines[i + 1].trim();
        i += 2;
      } else {
        inst = line;
        i++;
      }

      // Check next line for date or grade
      if (i < eduLines.length && (isDateLine(eduLines[i]) || /cgpa|gpa|%|grade|marks/i.test(eduLines[i]))) {
        const parts = eduLines[i].split(/[|•·]/).map(p => p.trim());
        for (const p of parts) {
          if (/cgpa|gpa|%|grade|marks/i.test(p)) grade = p;
          else if (/20\d\d|19\d\d/i.test(p)) yr = p;
        }
        if (!yr && !grade) yr = eduLines[i];
        i++;
      }

      if (inst || deg) {
        // Extract field from degree if present
        let field = '';
        const fieldMatch = deg.match(/\(([^)]+)\)|in\s+([A-Za-z\s&]+)/i);
        if (fieldMatch) {
          field = (fieldMatch[1] || fieldMatch[2] || '').trim();
        }
        education.push({
          institution: inst || 'University / Institution',
          degree: deg || 'Bachelor Degree',
          field,
          year: yr,
          grade
        });
      }
    }
  }

  // 5. Parse Work Experience & Internships with state machine
  const parseExperienceBlocks = (linesList: string[]) => {
    const result: Array<{ company: string; role: string; duration: string; summary: string }> = [];
    let i = 0;
    while (i < linesList.length) {
      const line = linesList[i].trim();
      if (!line) { i++; continue; }

      let company = '';
      let role = '';
      let duration = '';
      const bullets: string[] = [];

      // Pattern 1: Role — Company Duration | Location
      if (line.includes('—') || line.includes(' – ') || (line.includes(' - ') && !line.startsWith('-'))) {
        const sep = line.includes('—') ? '—' : line.includes(' – ') ? ' – ' : ' - ';
        const parts = line.split(sep).map(p => p.trim());
        if (parts.length >= 2) {
          if (isRoleLine(parts[0])) {
            role = parts[0];
            const rest = parts.slice(1).join(' - ');
            const sub = rest.split(/[|]/).map(p => p.trim());
            const compAndDate = sub[0];
            const dateMatch = compAndDate.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–to\s]+(?:\d{4}|present|current)\b|\b\d{4}\s*[-–to\s]+(?:\d{4}|present|current)\b/i);
            if (dateMatch) {
              duration = dateMatch[0];
              company = compAndDate.replace(dateMatch[0], '').replace(/[·•]/g, '').trim();
            } else {
              company = compAndDate;
            }
            if (!duration && sub[1] && isDateLine(sub[1])) {
              duration = sub[1];
            }
          } else {
            company = parts[0];
            role = parts[1];
          }
        } else {
          company = line;
        }
        i++;
      } else if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          if (isRoleLine(parts[1])) {
            company = parts[0];
            role = parts[1];
            if (parts[2]) duration = parts[2];
          } else if (isRoleLine(parts[0])) {
            role = parts[0];
            company = parts[1];
            if (parts[2]) duration = parts[2];
          } else {
            company = parts[0];
            role = parts[1];
          }
        } else {
          company = line;
        }
        i++;
      } else if (i + 1 < linesList.length && isRoleLine(linesList[i + 1])) {
        // Pattern B: Line i is Company, Line i+1 is Role
        company = line;
        role = linesList[i + 1].trim();
        i += 2;
      } else if (isRoleLine(line)) {
        // Pattern C: Line i is Role
        role = line;
        i++;
      } else {
        company = line;
        i++;
      }

      // Check next line for duration/date if not found yet
      if (!duration && i < linesList.length && isDateLine(linesList[i])) {
        duration = linesList[i].trim();
        i++;
      }

      // Clean company name of parenthetical descriptions
      if (company.includes('(')) {
        company = company.replace(/\s*\([^)]*\).*/g, '').trim();
      }

      // Gather following bullets / descriptions
      while (i < linesList.length) {
        const bLine = linesList[i].trim();
        if (!bLine) { i++; continue; }
        const isBullet = /^[-*•·–]/.test(bLine);

        if (isBullet) {
          bullets.push(bLine.replace(/^[-*•·–]\s*/, '').trim());
          i++;
        } else if (
          isRoleLine(bLine) ||
          (i + 1 < linesList.length && isRoleLine(linesList[i + 1])) ||
          isDateLine(bLine) ||
          (bLine.includes('—') && isRoleLine(bLine.split('—')[0])) ||
          (bLine.includes(' – ') && isRoleLine(bLine.split(' – ')[0]))
        ) {
          // Next job block begins!
          break;
        } else {
          bullets.push(bLine);
          i++;
        }
      }

      if (company || role) {
        result.push({
          company: company || 'Company',
          role: role || 'Software Engineer',
          duration,
          summary: bullets.join(' ')
        });
      }
    }
    return result;
  };

  const experience = parseExperienceBlocks(sections.experience);
  const internships = parseExperienceBlocks(sections.internships);

  // If internships empty, check experience items with 'intern' explicitly in role (keep Trainee in experience)
  for (let idx = experience.length - 1; idx >= 0; idx--) {
    if (/\b(intern|internship)\b/i.test(experience[idx].role)) {
      internships.push(experience.splice(idx, 1)[0]);
    }
  }

  // 6. Parse Projects
  const projects: Array<{ name: string; summary: string }> = [];
  if (sections.projects.length > 0) {
    let curName = '';
    let curBullets: string[] = [];

    const flushProj = () => {
      if (curName) {
        projects.push({ name: curName, summary: curBullets.join(' ') });
      }
      curName = '';
      curBullets = [];
    };

    const ACTION_VERBS = /^(?:architected|implemented|built|engineered|co-authored|authored|automated|designed|trained|developed|created|tested|deployed|managed|spearheaded|conducted|analyzed|evaluated|integrated|optimized|directed|owned|fine-tuned)\b/i;

    sections.projects.forEach(line => {
      const clean = line.trim();
      const isBullet = /^[-*•·–]/.test(clean);
      const isTitleLine = !isBullet && !ACTION_VERBS.test(clean) && (
        clean.includes('|') ||
        ((clean.includes('–') || clean.includes(' - ')) && clean.length <= 80) ||
        (clean.length > 3 && clean.length <= 60 && !clean.endsWith('.'))
      );
      if (isTitleLine) {
        if (curName) flushProj();
        curName = clean.replace(/[|].*/, '').trim();
      } else {
        curBullets.push(clean.replace(/^[-*•·–]\s*/, '').trim());
      }
    });
    flushProj();
  }

  // 7. Parse Skills & Tech
  const sectionSkills: string[] = [];
  if (sections.skills.length > 0) {
    sections.skills.forEach(line => {
      const content = line.includes(':') ? line.split(':')[1] : line;
      const parts = content.split(/[,;|•·\t\n]/).map(p => p.trim()).filter(Boolean);
      sectionSkills.push(...parts);
    });
  }

  const dictionarySkills = extractSkillsFromText(rawText);
  const technical_skills = Array.from(new Set([...sectionSkills, ...dictionarySkills]));

  const soft_skills = extractSoftSkillsFromText(rawText);
  if (soft_skills.length === 0) {
    soft_skills.push('STAR Communication', 'Technical Ownership', 'Problem Solving');
  }

  // 8. Parse Certifications & 9. Achievements
  const certifications: string[] = [];
  const achievements: string[] = [];

  const rawCertAchieveLines = [...sections.certifications, ...sections.achievements];
  if (rawCertAchieveLines.length > 0) {
    rawCertAchieveLines.forEach(line => {
      const clean = line.replace(/^[-*•·–]\s*/, '').trim();
      if (!clean) return;

      // Handle piped lines (e.g. Claude Certified Architect | Claude Certified Associate)
      const subParts = clean.split('|').map(s => s.trim()).filter(Boolean);
      for (const part of subParts) {
        if (/\b(?:certified|certification|architect|associate|developer|foundations|professional|license|credential)\b/i.test(part)) {
          certifications.push(part);
        } else if (/\b(\d+[\d,.]*(?:\+|%|k|M|cr|L|orders?|revenue)?|\₹[\d,.]+|\$[\d,.]+|paper|springer|icict|published|built|deployed|hackathon|winner)\b/i.test(part)) {
          achievements.push(part);
        } else if (part.length > 10) {
          achievements.push(part);
        }
      }
    });
  }

  if (certifications.length === 0) {
    const certMatches = rawText.match(/\b(?:AWS|Azure|GCP|CKAD|CKA|PMP|Scrum Master|Google Cloud|Claude Certified [A-Za-z\s–-]+)\b/gi);
    if (certMatches) {
      certifications.push(...Array.from(new Set(certMatches.map(c => c.trim()))));
    }
  }

  if (achievements.length === 0) {
    const metricMatches = rawText.match(/[-*•·–]\s*([^.\n]*(?:winner|hackathon|top\s*\d|ranked|\₹[\d,.]+|\$[\d,.]+|\d+%\s*reduction|\d+%\s*increase|\d+\+\s*orders|\d+\+\s*users)[^.\n]*)/gi);
    if (metricMatches) {
      achievements.push(...metricMatches.map(m => m.replace(/^[-*•·–]\s*/, '').trim()).slice(0, 4));
    }
  }

  // 10. Infer Domains
  const domains = inferDomainsFromText(rawText, technical_skills);

  // Compute years of experience
  const expMatch = rawText.match(/(\d+)\+?\s*(?:years|yrs|year)\s*(?:of\s*)?(?:experience|exp)?/i);
  const experienceYears = expMatch ? parseInt(expMatch[1], 10) : Math.max(experience.length, 2);

  const rawStructured = {
    basics: {
      fullName: candidateName,
      email,
      phone,
      location,
      summary,
    },
    education,
    workExperience: experience,
    internships,
    projects,
    technicalSkills: technical_skills,
    softSkills: soft_skills,
    technologies: technical_skills,
    certifications,
    achievements,
    domains,
  };

  const canonical = normalizeResumeProfile(rawStructured, userAccount);

  return {
    ...canonical,
    candidateName: canonical.basics.fullName || canonical.name,
    targetTitle: lines[1]?.slice(0, 50) || 'Software Engineer',
    experienceYears: Math.min(Math.max(experienceYears, 1), 20),
    skills: canonical.technicalSkills,
    rawText
  };
}

export function parseJDText(rawText: string, fallbackPreset?: JobDescription): JobDescription {
  if (!rawText.trim() && fallbackPreset) return fallbackPreset;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 60) || 'Senior Engineer';
  const company = lines[1]?.includes('at ') ? lines[1].replace(/.*at\s+/i, '').slice(0, 40) : 'Enterprise Practice';

  const expMatch = rawText.match(/(\d+)\+?\s*(?:years|yrs)\s*(?:of\s*)?(?:required|experience)?/i);
  const experienceRequiredYears = expMatch ? parseInt(expMatch[1], 10) : 4;

  const skills = extractSkillsFromText(rawText);

  return {
    title,
    company,
    experienceRequiredYears,
    requiredSkills: skills.slice(0, 7),
    preferredSkills: skills.slice(7, 12),
    responsibilities: lines.slice(2, 6),
    rawText
  };
}

export function analyzeResumeJDMatch(resume: ResumeProfile, jd: JobDescription): ResumeJDMatch {
  const resumeSkillsLower = new Set(resume.skills.map(s => s.toLowerCase()));
  const jdSkills = [...jd.requiredSkills, ...jd.preferredSkills];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  jdSkills.forEach(skill => {
    if (resumeSkillsLower.has(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const totalEvaluated = Math.max(jdSkills.length, 1);
  const matchRatio = matchedSkills.length / totalEvaluated;
  const matchPercentage = Math.min(96, Math.max(55, Math.round(matchRatio * 100)));

  // Generate 4 targeted questions cross-examining candidate's resume claims against JD expectations!
  const targetedQuestions: ResumeJDMatch['targetedQuestions'] = [
    {
      stage: 'Background & Fit',
      question: `Walk me through your engineering career. How does your experience with ${resume.skills.slice(0, 3).join(', ')} directly align with our team's requirements for ${jd.title}?`,
      context: `Verifying career narrative and direct role fit against ${jd.title} at ${jd.company}.`,
      expectedEvidence: [
        'Concise 90-120s past/present/future journey',
        `Explicitly connections to ${jd.title}`,
        'Executive clarity and absence of filler words'
      ]
    },
    {
      stage: 'Technical Architecture',
      question: `In your resume, you highlighted '${resume.projects[0]?.title || 'your recent architecture project'}'. How did you design for reliability and scalability, and how would you adapt that design to meet our ${jd.requiredSkills[0] || 'core stack'} requirements?`,
      context: `Deep-diving into candidate's claim: "${resume.projects[0]?.title}". Probing architectural trade-offs against JD core skills.`,
      expectedEvidence: [
        'Deep architectural trade-off justification',
        'Specific numbers/SLAs quoted from past experience',
        `Mastery of ${jd.requiredSkills[0] || 'core technologies'}`
      ]
    },
    {
      stage: 'Behavioral & STAR',
      question: `Describe a situation where a critical deliverable involving ${matchedSkills[0] || 'your core stack'} faced an unexpected production bottleneck or outage. Walk through the Situation, Task, Action, and quantifiable Result.`,
      context: `STAR framework rigorous validation on real technical adversity.`,
      expectedEvidence: [
        'Clear Situation and Task boundaries',
        'First-person action verbs (I led, I diagnosed, I shipped)',
        'Quantified business/technical yield in Result (%, latency, downtime saved)'
      ]
    },
    {
      stage: 'Gap Probing',
      question: missingSkills.length > 0 
        ? `Our position requires hands-on ownership with ${missingSkills.slice(0, 2).join(' and ')}, which wasn't heavily featured on your resume. How would you ramp up and apply your experience in ${matchedSkills[0] || 'related technologies'} to master this in your first 30 days?`
        : `How do you measure success and maintain 99.999% availability when scaling systems under high concurrent load?`,
      context: missingSkills.length > 0 
        ? `Probing detected skill gap: [${missingSkills.slice(0, 2).join(', ')}] vs candidate core strength [${matchedSkills[0] || 'core skills'}].`
        : `Probing high-scale resilience and architectural maturity.`,
      expectedEvidence: [
        'Self-awareness without being defensive',
        'Concrete learning framework and velocity',
        'Analogy bridging past mastery to the new requirement'
      ]
    }
  ];

  return {
    matchPercentage,
    matchedSkills: Array.from(new Set(matchedSkills)),
    missingSkills: Array.from(new Set(missingSkills)),
    alignmentSummary: `Candidate demonstrates strong competency in ${matchedSkills.slice(0, 4).join(', ') || 'core fundamentals'}, matching ${matchPercentage}% of the requirements for ${jd.title}. Key probing areas identified: ${missingSkills.slice(0, 2).join(', ') || 'production edge-cases'}.`,
    targetedQuestions
  };
}
