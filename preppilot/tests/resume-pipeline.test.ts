import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResumeProfile, parseResumeText } from '@/lib/resumeParser';
import { buildResumeGroundingDocuments, validateCanonicalResumeProfile, validateExtractedResumeText } from '@/lib/resume/resumeSchema';

test('rejects PDF/binary markers before parsing or embedding', () => {
  assert.equal(validateExtractedResumeText('%PDF-1.7 stream endobj').ok, false);
  assert.equal(validateExtractedResumeText('A readable resume with enough alphabetic content for parsing').ok, true);
});

test('preserves company, role, location, and dates as separate structured fields', () => {
  const profile = normalizeResumeProfile({
    basics: { fullName: 'Asha Rao', email: '', phone: '', location: 'Chennai, India', summary: '' },
    workExperience: [{ company: 'Acme', role: 'Platform Engineer', location: 'Remote', startDate: '2022', endDate: 'Present', summary: 'Built APIs' }],
    projects: [{ name: 'Search', summary: 'Semantic retrieval', technologies: ['Python'] }],
  });
  assert.equal(profile.workExperience[0].company, 'Acme');
  assert.equal(profile.workExperience[0].role, 'Platform Engineer');
  assert.equal(profile.workExperience[0].location, 'Remote');
  assert.equal(profile.workExperience[0].startDate, '2022');
  assert.equal(profile.workExperience[0].endDate, 'Present');
  assert.equal(validateCanonicalResumeProfile(profile).ok, true);
  assert.ok(buildResumeGroundingDocuments(profile, 'r1').some((doc) => doc.section === 'experience' && doc.text.includes('Acme')));
});

test('rejects normalized placeholder contamination from malformed model output', () => {
  const profile = normalizeResumeProfile({ workExperience: [{}] });
  const result = validateCanonicalResumeProfile(profile);
  assert.equal(result.ok, false);
});

test('parses flattened two-column employment layout without mixing fields', () => {
  const profile = parseResumeText(`Asha Rao\nAI Engineer\n\nPROFESSIONAL EXPERIENCE\nProdapt | July 2026 – Present\nForward Deployed Engineer Trainee | Chennai, India\n- Built an internal automation platform\n\nCraftTech 360 | Feb 2025 – May 2025\nSoftware Intern | Bengaluru, India\n- Implemented backend services\n\nBharat Electronics Limited\nGeographic Information System Intern | Bengaluru, India\nJune 2024 – July 2024\n- Created GIS tooling\n\nSKILLS\nPython | FastAPI`);
  const experience = profile.workExperience;
  assert.equal(experience.length, 3);
  assert.deepEqual(experience.map((x) => [x.company, x.role, x.location, x.startDate, x.endDate, x.isCurrent]), [
    ['Prodapt', 'Forward Deployed Engineer Trainee', 'Chennai, India', 'July 2026', 'Present', true],
    ['CraftTech 360', 'Software Intern', 'Bengaluru, India', 'Feb 2025', 'May 2025', false],
    ['Bharat Electronics Limited', 'Geographic Information System Intern', 'Bengaluru, India', 'June 2024', 'July 2024', false],
  ]);
  assert.deepEqual(experience.map((x) => x.responsibilities), [
    ['Built an internal automation platform'],
    ['Implemented backend services'],
    ['Created GIS tooling'],
  ]);
  for (const item of experience) {
    assert.notEqual(item.company, 'Company');
    assert.ok(!/\b(?:19|20)\d{2}\b/.test(item.role));
    assert.ok(!item.role.includes(item.location || '__missing__'));
  }
});

test('parses a different employer/title layout without company-specific rules', () => {
  const profile = parseResumeText(`Jordan Lee\n\nWORK EXPERIENCE\nNorthwind Labs\nSenior Data Engineer\nRemote\nJan 2021 - Dec 2023\n- Owned the ETL reliability program\n\nEDUCATION\nState University\nB.S. Computer Science`);
  assert.equal(profile.workExperience[0].company, 'Northwind Labs');
  assert.equal(profile.workExperience[0].role, 'Senior Data Engineer');
  assert.equal(profile.workExperience[0].location, 'Remote');
  assert.equal(profile.workExperience[0].startDate, 'Jan 2021');
  assert.equal(profile.workExperience[0].endDate, 'Dec 2023');
  assert.deepEqual(profile.workExperience[0].responsibilities, ['Owned the ETL reliability program']);
});

test('keeps Technical Projects out of experience and preserves project technologies', () => {
  const profile = parseResumeText(`Ayush Shetty\nAI/ML Engineer\n\nPROFESSIONAL EXPERIENCE\nProdapt | July 2026 – Present\nForward Deployed Engineer Trainee | Chennai, India\n- Built enterprise automation\nCraftTech 360 | Feb 2025 – May 2025\nSoftware Intern | Bengaluru, India\nBharat Electronics Limited | June 2024 – July 2024\nGeographic Information System Intern | Bengaluru, India\n\nTECHNICAL PROJECTS\nWorkday HR Data Query & Reporting Agent | LangGraph, ChromaDB, FastAPI, React\n- Built a grounded HR reporting agent\nDISH-DETECTIVE – Multimodal AI | AutoGen, GPT-5-nano, Streamlit\n- Classified dish images\nHOVA – Computer Vision Attendance | Computer Vision, KNN, OpenCV, PostGIS, QGIS\n- Automated attendance\nSensAI – AI-Powered Career Assistant | OpenAI SDK, GPT-5-nano, FastAPI\n- Built a career assistant\n\nEDUCATION\nJain University | B.Tech – Information Science and Engineering | 2022–2026\nKarkala Jnanasudha PU College | 12th – PCMB | 2019–2021`);
  assert.equal(profile.workExperience.length, 3);
  assert.equal(profile.projects.length, 4);
  assert.equal(profile.education.length, 2);
  assert.deepEqual(profile.projects.map((project) => project.name), [
    'Workday HR Data Query & Reporting Agent',
    'DISH-DETECTIVE – Multimodal AI',
    'HOVA – Computer Vision Attendance',
    'SensAI – AI-Powered Career Assistant',
  ]);
  assert.ok(profile.projects.every((project) => project.sectionSource === 'technical_projects'));
  assert.ok(profile.projects.every((project) => !profile.workExperience.some((experience) => experience.company === project.name)));
  assert.ok(profile.projects[0].technologies?.includes('LangGraph'));
});
