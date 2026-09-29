import { z } from 'zod';
import type { CandidateProfile } from '@/lib/api';

/**
 * Resume data crosses two trust boundaries: document extraction and the LLM.
 * Keep these checks independent from the parser so both AI and deterministic
 * paths are required to produce the same safe shape.
 */
export const resumeTextValidation = z.object({
  text: z.string().min(20),
  charCount: z.number().int().positive(),
  alphaRatio: z.number().min(0).max(1),
});

const stringArray = z.array(z.string()).default([]);
const basics = z.object({
  fullName: z.string(), email: z.string(), phone: z.string(), location: z.string(), summary: z.string(),
});

export const canonicalResumeSchema = z.object({
  basics,
  education: z.array(z.record(z.string(), z.unknown())).default([]),
  workExperience: z.array(z.record(z.string(), z.unknown())).default([]),
  internships: z.array(z.record(z.string(), z.unknown())).default([]),
  projects: z.array(z.record(z.string(), z.unknown())).default([]),
  technicalSkills: stringArray,
  softSkills: stringArray,
  technologies: stringArray,
  certifications: stringArray,
  achievements: stringArray,
  domains: stringArray,
});

const suspiciousText = /%PDF-|FlateDecode|endstream|endobj|xref|\u0000|[\uFFFD]/i;
const dateLikeValue = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|(?:19|20)\d{2}\s*(?:[-–—]|\/\/|to)\s*(?:Present|Current|(?:19|20)\d{2})/i;

export function validateExtractedResumeText(text: unknown) {
  if (typeof text !== 'string') return { ok: false as const, reason: 'not_text' };
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length < 20) return { ok: false as const, reason: 'too_short' };
  if (suspiciousText.test(normalized)) return { ok: false as const, reason: 'binary_or_pdf_stream' };
  const printable = normalized.replace(/\s/g, '');
  const alphaNumeric = (printable.match(/[A-Za-z0-9]/g) || []).length;
  const alphaRatio = printable.length ? alphaNumeric / printable.length : 0;
  if (alphaRatio < 0.35) return { ok: false as const, reason: 'low_readable_text_ratio' };
  return { ok: true as const, text: normalized, charCount: normalized.length, alphaRatio };
}

export function validateCanonicalResumeProfile(profile: unknown):
  { ok: true; profile: CandidateProfile } | { ok: false; reason: string } {
  const parsed = canonicalResumeSchema.safeParse(profile);
  if (!parsed.success) return { ok: false, reason: 'canonical_schema_invalid' };
  const value = parsed.data as unknown as CandidateProfile;
  const allText = JSON.stringify(value);
  if (suspiciousText.test(allText)) return { ok: false, reason: 'canonical_profile_contains_binary_markers' };
  if (value.workExperience.some((x: any) => x.company === 'Company' || x.role === 'Engineer') ||
      value.internships.some((x: any) => x.company === 'Company' || x.role === 'Intern') ||
      value.education.some((x: any) => x.institution === 'University / Institution')) {
    return { ok: false, reason: 'canonical_profile_contains_placeholder_fields' };
  }
  const experiences = [...value.workExperience, ...value.internships] as any[];
  if (value.workExperience.some((x: any) => x.sectionSource && x.sectionSource !== 'professional_experience') ||
      value.internships.some((x: any) => x.sectionSource && x.sectionSource !== 'internships')) {
    return { ok: false, reason: 'experience_section_provenance_invalid' };
  }
  if (value.projects.some((x: any) => x.sectionSource && !['projects', 'technical_projects'].includes(x.sectionSource))) {
    return { ok: false, reason: 'project_section_provenance_invalid' };
  }
  if (value.projects.some((x: any) => /^(technical\s+)?projects?$|^education$|^professional\s+experience$/i.test(String(x.name || '')))) {
    return { ok: false, reason: 'section_header_stored_as_project' };
  }
  if (experiences.some((x) => dateLikeValue.test(String(x.company || '')) || dateLikeValue.test(String(x.role || '')))) {
    return { ok: false, reason: 'canonical_profile_has_date_in_company_or_role' };
  }
  if (experiences.some((x) => x.location && dateLikeValue.test(String(x.location)))) {
    return { ok: false, reason: 'canonical_profile_has_date_in_location' };
  }
  const hasMeaningfulData = Boolean(
    value.basics.fullName || value.basics.summary || value.education.length ||
    value.workExperience.length || value.internships.length || value.projects.length ||
    value.technicalSkills.length,
  );
  if (!hasMeaningfulData) return { ok: false, reason: 'canonical_profile_empty' };
  return { ok: true, profile: value };
}

export interface ResumeGroundingDocument {
  id: string;
  section: 'summary' | 'experience' | 'internship' | 'project' | 'education' | 'skills';
  text: string;
  metadata: { resumeId?: string; source: 'structured_resume'; index: number; company?: string; role?: string; project_name?: string };
}

/** Section-aware documents are the stable seam for a future vector adapter. */
export function buildResumeGroundingDocuments(profile: CandidateProfile, resumeId?: string): ResumeGroundingDocument[] {
  const docs: ResumeGroundingDocument[] = [];
  const add = (section: ResumeGroundingDocument['section'], text: string, index: number, extra: { company?: string; role?: string; project_name?: string } = {}) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean) docs.push({ id: `${resumeId || 'resume'}_${section}_${index}`, section, text: clean, metadata: { resumeId, source: 'structured_resume', index, ...extra } });
  };
  add('summary', `${profile.basics.fullName}. ${profile.basics.summary}`, 0);
  profile.workExperience.forEach((x, i) => add('experience', `${x.role} at ${x.company}. ${x.startDate || ''}-${x.endDate || ''}. ${x.summary || ''} ${(x.technologies || []).join(', ')}`, i, { company: x.company, role: x.role }));
  profile.internships.forEach((x, i) => add('internship', `${x.role} at ${x.company}. ${x.startDate || ''}-${x.endDate || ''}. ${x.summary || ''}`, i, { company: x.company, role: x.role }));
  profile.projects.forEach((x, i) => add('project', `${x.name}. ${x.summary} ${(x.technologies || []).join(', ')}`, i, { project_name: x.name }));
  profile.education.forEach((x, i) => add('education', `${x.degree} at ${x.institution}. ${x.field || ''} ${x.year || ''}`, i));
  add('skills', [...profile.technicalSkills, ...profile.technologies, ...profile.softSkills].join(', '), 0);
  return docs;
}
