import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import zlib from 'zlib';
import { createHash } from 'crypto';
import { executeChatCompletion } from '@/server/ai/llmClient';
import { traceLlmCall } from '@/lib/interview/tracing';
import { extractSkillsFromText, parseResumeText, normalizeResumeProfile } from '@/lib/resumeParser';
import { CandidateProfile } from '@/lib/api';
import { validateCanonicalResumeProfile, validateExtractedResumeText } from '@/lib/resume/resumeSchema';

// A candidate can always review and edit a deterministic profile. Do not make
// onboarding wait indefinitely for an optional AI-enrichment request.
// Resume extraction is a large structured request. The provider traces show
// valid requests taking longer than the old 7.5s cutoff.
const PROFILE_AI_TIMEOUT_MS = 30_000;
const RESUME_PARSER_VERSION = 'resume-parser-v4';
const resumeSnapshotCache = new Map<string, { profile: CandidateProfile; source: 'ai' | 'heuristic'; createdAt: string; resumeHash: string }>();

async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const lowerName = fileName.toLowerCase();

  // 1. DOCX file extraction via Mammoth
  if (lowerName.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      if (result && result.value && result.value.trim().length >= 20) {
        return result.value.trim();
      }
    } catch (docxErr) {
      console.warn('[Resume] Mammoth extraction failed, attempting XML regex fallback:', docxErr);
    }

    // DOCX XML fallback
    try {
      const rawStr = buffer.toString('latin1');
      const wtMatches = rawStr.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi);
      if (wtMatches && wtMatches.length > 0) {
        const text = wtMatches
          .map(tag => tag.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length >= 20) {
          return text;
        }
      }
    } catch (xmlErr) {
      console.warn('[Resume] DOCX XML fallback failed:', xmlErr);
    }

    throw new Error('Unable to extract text from DOCX file. Please ensure the document is not corrupted or password protected.');
  }

  // 2. PDF extraction
  if (lowerName.endsWith('.pdf')) {
    // Resolve PDF worker path across environments
    const candidateWorkerPaths = [
      path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
      path.join(process.cwd(), 'node_modules/pdf-parse/dist/pdf-parse/web/pdf.worker.mjs'),
      path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
    ];
    const workerPath = candidateWorkerPaths.find(p => fs.existsSync(p));

    // Attempt A: Direct pdfjs-dist extraction (preserves multi-page line positioning)
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (workerPath) {
        pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
      }
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true,
      }).promise;

      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const textItems = content.items
          .filter((item: any) => 'str' in item && String(item.str).trim())
          .map((item: any) => ({ text: String(item.str), x: Number(item.transform?.[4] || 0), y: Number(item.transform?.[5] || 0) }))
          .sort((a, b) => Math.abs(a.y - b.y) > 4 ? b.y - a.y : a.x - b.x);
        let lastY: number | null = null;
        let pageText = '';
        for (const item of textItems) {
          if (lastY !== null && Math.abs(item.y - lastY) > 4) pageText += '\n';
          else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) pageText += ' ';
          pageText += item.text;
          lastY = item.y;
        }
        fullText += pageText + '\n\n';
      }

      if (fullText.trim().length >= 20) {
        return fullText.trim();
      }
    } catch (pdfjsErr) {
      console.warn('[Resume] pdfjs-dist primary extraction failed, attempting PDFParse fallback:', pdfjsErr);
    }

    // Attempt B: PDFParse fallback
    try {
      const { PDFParse } = await import('pdf-parse');
      if (workerPath) {
        PDFParse.setWorker(pathToFileURL(workerPath).href);
      }
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      if (result && result.text && result.text.trim().length >= 20) {
        return result.text.trim();
      }
    } catch (pdfParseErr) {
      console.warn('[Resume] PDFParse fallback failed, trying stream decompressor:', pdfParseErr);
    }

    // Attempt C: Raw PDF stream decompression fallback
    try {
      const rawStr = buffer.toString('latin1');
      let extractedPdfText = '';

      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      while ((match = streamRegex.exec(rawStr)) !== null) {
        const rawStream = Buffer.from(match[1], 'latin1');
        let decompressed = '';
        try {
          decompressed = zlib.inflateSync(rawStream).toString('utf-8');
        } catch {
          try {
            decompressed = zlib.inflateRawSync(rawStream).toString('utf-8');
          } catch {
            decompressed = match[1];
          }
        }

        const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
          extractedPdfText += tjMatch[1] + ' ';
        }

        const arrayRegex = /\[(.*?)\]\s*TJ/g;
        let arrMatch;
        while ((arrMatch = arrayRegex.exec(decompressed)) !== null) {
          const parts = arrMatch[1].match(/\(([^)]+)\)/g) || [];
          extractedPdfText += parts.map(p => p.slice(1, -1)).join('') + ' ';
        }
      }

      if (extractedPdfText.trim().length >= 20) {
        return extractedPdfText
          .replace(/\\([()\\])/g, '$1')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (decompErr) {
      console.warn('[Resume] Stream decompression failed:', decompErr);
    }

    throw new Error('Unable to extract readable text from PDF. The document may be scanned (image-only), password-protected, or unsupported.');
  }

  // 3. Plain text / Markdown / UTF-8
  const text = buffer.toString('utf-8').trim();
  if (text.length >= 20) {
    return text;
  }

  throw new Error('File content is empty or contains insufficient text.');
}

export async function POST(req: NextRequest) {
  try {
    const requestId = req.headers.get('x-request-id') || `resume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let rawText = '';
    let fileName = 'resume.txt';
    let fileSize = 0;
    let fileMime = 'text/plain';
    let candidateId = req.headers.get('x-candidate-id') || '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = (formData.get('file') || formData.get('resume')) as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      fileName = file.name;
      fileSize = file.size;
      fileMime = file.type || 'application/octet-stream';
      candidateId = candidateId || String(formData.get('candidate_id') || '');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Section 6 & 26 Logging
      console.log(`[Resume] File received: ${fileName}`);
      console.log(`[Resume] File type: ${fileMime}`);
      console.log(`[Resume] File size: ${fileSize} bytes`);
      console.log(`[Resume] Extracting text...`);

      rawText = await extractTextFromBuffer(buffer, fileName);
    } else {
      const body = await req.json().catch(() => ({}));
      rawText = body.text || '';
      fileName = body.fileName || 'resume.txt';
      candidateId = candidateId || String(body.candidateId || body.candidate_id || '');
      fileSize = rawText.length;
      console.log(`[Resume] Text payload received: ${rawText.length} characters`);
    }

    const textCheck = validateExtractedResumeText(rawText);
    console.log(`[Resume] Extracted characters: ${rawText.length}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ResumePipeline] stage=extracted_text', JSON.stringify({ requestId, fileName, charCount: rawText.length, preview: rawText.slice(0, 500) }));
    }

    // Section 6: Validate that actual readable text exists before parsing
    if (!textCheck.ok) {
      return NextResponse.json({
        error: 'Unable to extract readable resume text. Please check the file format or ensure it contains readable text.',
        reason: textCheck.reason,
      }, { status: 400 });
    }
    rawText = textCheck.text;
    const resumeHash = createHash('sha256').update(rawText).digest('hex');
    const snapshotKey = `${candidateId || 'anonymous'}:${RESUME_PARSER_VERSION}:${resumeHash}`;
    const cachedSnapshot = resumeSnapshotCache.get(snapshotKey);
    if (cachedSnapshot) {
      console.info('[ResumePipeline] stage=snapshot_cache_hit', JSON.stringify({ requestId, candidateId: candidateId || undefined, resumeHash, parserVersion: RESUME_PARSER_VERSION, parserSource: cachedSnapshot.source }));
      return NextResponse.json({
        status: 'ok', requestId, profile: cachedSnapshot.profile, source: cachedSnapshot.source,
        llmAttempted: false, llmSucceeded: cachedSnapshot.source === 'ai', fallbackUsed: cachedSnapshot.source === 'heuristic',
        cached: true, resumeHash, parserVersion: RESUME_PARSER_VERSION,
        diagnostic: { fileName, fileSize, charCount: rawText.length, parserSource: cachedSnapshot.source, candidateName: cachedSnapshot.profile.basics.fullName || cachedSnapshot.profile.name, experienceCount: cachedSnapshot.profile.workExperience.length, projectsCount: cachedSnapshot.profile.projects.length, educationCount: cachedSnapshot.profile.education.length, timestamp: cachedSnapshot.createdAt },
      });
    }

    console.log(`[Resume] Parsing resume...`);

    let normalized: CandidateProfile | null = null;
    let source: 'ai' | 'heuristic' = 'heuristic';
    let llmAttempted = false;
    let llmSucceeded = false;
    let fallbackReason: string | undefined;

    // 1. Try AI Structuring via LLM (Section 10 Canonical Schema), but do not
    // make a known-unconfigured provider request.
    const systemPrompt = `You are the Cadence AI Profile Agent. Your mission is to thoroughly read the candidate's resume text and build a high-fidelity, comprehensive candidate profile conforming strictly to the canonical schema.
Preserve all authentic details from the resume without truncating valuable project, experience, education, metrics, or technologies evidence.
NEVER fabricate or invent candidate information.

You must return valid JSON strictly conforming to this schema:
{
  "basics": {
    "fullName": string (candidate's actual full name),
    "email": string (email address),
    "phone": string (phone number),
    "location": string (city, state/country),
    "summary": string (2-3 sentence executive professional summary)
  },
  "education": [
    { "institution": string, "degree": string, "field": string, "startDate": string, "endDate": string, "year": string, "grade": string, "location": string, "sectionSource": "education" }
  ],
  "workExperience": [
    { "company": string, "role": string, "location": string, "startDate": string, "endDate": string, "isCurrent": boolean, "duration": string, "summary": string, "responsibilities": string[], "achievements": string[], "technologies": string[], "metrics": string[], "sectionSource": "professional_experience" }
  ],
  "internships": [
    { "company": string, "role": string, "location": string, "startDate": string, "endDate": string, "isCurrent": boolean, "duration": string, "summary": string, "responsibilities": string[], "achievements": string[], "technologies": string[], "metrics": string[], "sectionSource": "internships" }
  ],
  "projects": [
    { "name": string, "summary": string, "description": string, "descriptions": string[], "technologies": string[], "year": string, "sectionSource": "technical_projects", "metrics": string[] }
  ],
  "technicalSkills": string[] (programming languages, frameworks, cloud, databases, tools, ML/AI),
  "softSkills": string[] (STAR communication, ownership, leadership, etc.),
  "technologies": string[] (specific tools and technologies used),
  "certifications": string[] (certifications or credentials),
  "achievements": string[] (awards, hackathons, publications, quantifiable metric outcomes),
  "domains": string[] (e.g. Quick-Commerce, E-Commerce, FinTech, AI/ML, Cloud Infrastructure, Telecommunications, Enterprise SaaS, Distributed Systems)
}

Do NOT wrap the output in markdown codeblocks. Output raw valid JSON only.

Extraction rules: employment entries may ONLY come from Professional Experience or Work Experience; project entries may ONLY come from Projects or Technical Projects; education entries may ONLY come from Education. Never convert a project into employment. Never invent a company, role, or generic role such as Engineer. Section headings are not records. Keep dates, locations, and technologies in their own fields. Preserve bullet points under the correct record. Use empty strings/arrays when unsupported. Every value must be supported by the resume. Set sectionSource to professional_experience, internships, technical_projects, or education as appropriate.`;

    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
      llmAttempted = true;
      const resumeMessages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `Extract the candidate profile from this resume text:\n\n${rawText.slice(0, 15000)}` },
      ];
      const completion = await traceLlmCall(
        'resume-profile-extraction',
        resumeMessages,
        () => executeChatCompletion({
          messages: resumeMessages,
          temperature: 0.1,
          responseFormat: 'json_object',
          timeoutMs: PROFILE_AI_TIMEOUT_MS,
          maxRetries: 0,
          component: 'resume-profile-extraction',
          caller: 'onboarding.resume_parser',
          purpose: 'resume_context_processing',
          questionSource: 'llm',
          requestId,
        }),
        { model: process.env.OPENAI_MODEL, baseURL: process.env.OPENAI_BASE_URL, requestId },
      );

      const rawContent = completion.choices[0]?.message?.content || '';
      const cleanJson = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      const candidateProfile = normalizeResumeProfile(parsed);
      const profileCheck = validateCanonicalResumeProfile(candidateProfile);

      if (profileCheck.ok) {
        normalized = profileCheck.profile;
        source = 'ai';
        llmSucceeded = true;
        console.log(`[Resume] AI parser succeeded; schema=canonical`);
      } else {
        fallbackReason = profileCheck.reason;
        throw new Error(`LLM profile validation failed: ${profileCheck.reason}`);
      }
      } catch (llmError: any) {
      // Section 11: LLM error must not break onboarding; fall back to deterministic parser
      console.warn(`[Resume] LLM extraction error (${llmError?.message || llmError}), activating deterministic fallback parser`);
      const message = String(llmError?.message || llmError).toLowerCase();
      fallbackReason = message.includes('timeout') ? 'timeout'
        : message.includes('json') || message.includes('malformed') ? 'invalid_model_response'
          : message.includes('api key') || message.includes('authentication') ? 'missing_or_invalid_api_key'
            : 'provider_request_failure';
      }
    } else {
      fallbackReason = 'missing_api_key';
    }

    // 2. Deterministic Heuristic Fallback (Section 12)
    if (!normalized) {
      console.log(`[Resume] Running deterministic local fallback parser...`);
      const fallback = parseResumeText(rawText);
      normalized = normalizeResumeProfile(fallback);
      source = 'heuristic';
    }

    const resumeId = `resume_${requestId}_${Date.now().toString(36)}`;
    normalized.resumeId = resumeId;
    normalized.parsedAt = new Date().toISOString();
    normalized.parserSource = source;
    resumeSnapshotCache.set(snapshotKey, { profile: normalized, source, createdAt: new Date().toISOString(), resumeHash });
    if (resumeSnapshotCache.size > 100) resumeSnapshotCache.delete(resumeSnapshotCache.keys().next().value as string);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ResumePipeline] stage=normalized_profile', JSON.stringify({
        requestId,
        source,
        experience: normalized.workExperience.map((entry) => ({
          company: entry.company,
          role: entry.role,
          location: entry.location || '',
          startDate: entry.startDate || '',
          endDate: entry.endDate || '',
          isCurrent: Boolean(entry.isCurrent),
          responsibilities: entry.responsibilities || [],
        })),
      }));
    }

    // Section 26 Logging
    console.log(`[Resume] Structured profile generated:`);
    console.log(`→ ${normalized.workExperience.length} experience entries`);
    console.log(`→ ${normalized.internships.length} internship entries`);
    console.log(`→ ${normalized.projects.length} projects`);
    console.log(`→ ${normalized.technicalSkills.length} skills`);
    console.log(`→ ${normalized.certifications.length} certifications`);
    console.log(`→ ${normalized.education.length} education entries`);
    console.log(`[Resume] Saving candidate profile`);

    const diagnostic = {
      fileName,
      fileSize,
      charCount: rawText.length,
      parserSource: source,
      candidateName: normalized.basics.fullName || normalized.name,
      experienceCount: normalized.workExperience.length,
      internshipsCount: normalized.internships.length,
      projectsCount: normalized.projects.length,
      skillsCount: normalized.technicalSkills.length,
      certificationsCount: normalized.certifications.length,
      achievementsCount: normalized.achievements.length,
      educationCount: normalized.education.length,
      experience: normalized.workExperience.map((entry) => ({
        company: entry.company,
        role: entry.role,
        location: entry.location || '',
        startDate: entry.startDate || '',
        endDate: entry.endDate || '',
        isCurrent: Boolean(entry.isCurrent),
        responsibilities: entry.responsibilities || [],
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 'ok',
      requestId,
      profile: normalized,
      source,
      llmAttempted,
      llmSucceeded,
      fallbackUsed: source === 'heuristic',
      fallbackReason,
      cached: false,
      candidateId: candidateId || undefined,
      resumeHash,
      parserVersion: RESUME_PARSER_VERSION,
      diagnostic,
    });
  } catch (error: any) {
    console.error('[Resume] Error processing resume upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to process resume' }, { status: 500 });
  }
}
