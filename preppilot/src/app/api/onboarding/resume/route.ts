import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import zlib from 'zlib';
import { executeChatCompletion } from '@/server/ai/llmClient';
import { extractSkillsFromText, parseResumeText, normalizeResumeProfile } from '@/lib/resumeParser';
import { CandidateProfile } from '@/lib/api';

// A candidate can always review and edit a deterministic profile. Do not make
// onboarding wait indefinitely for an optional AI-enrichment request.
const PROFILE_AI_TIMEOUT_MS = 7_500;

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
        let lastY: number | null = null;
        let pageText = '';
        for (const item of content.items) {
          if ('str' in item) {
            const itemObj = item as any;
            if (lastY !== null && Math.abs(itemObj.transform[5] - lastY) > 4) {
              pageText += '\n';
            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            pageText += itemObj.str;
            lastY = itemObj.transform[5];
          }
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
    let rawText = '';
    let fileName = 'resume.txt';
    let fileSize = 0;
    let fileMime = 'text/plain';

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
      fileSize = rawText.length;
      console.log(`[Resume] Text payload received: ${rawText.length} characters`);
    }

    console.log(`[Resume] Extracted characters: ${rawText.length}`);

    // Section 6: Validate that actual readable text exists before parsing
    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json({
        error: 'Unable to extract text from the uploaded document. Please check the file format or ensure it contains readable text.'
      }, { status: 400 });
    }

    console.log(`[Resume] Parsing resume...`);

    let normalized: CandidateProfile | null = null;
    let source: 'ai' | 'heuristic' = 'heuristic';

    // 1. Try AI Structuring via LLM (Section 10 Canonical Schema)
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
    { "institution": string, "degree": string, "field": string, "year": string, "grade": string }
  ],
  "workExperience": [
    { "company": string, "role": string, "duration": string, "summary": string, "responsibilities": string[], "achievements": string[], "technologies": string[], "metrics": string[] }
  ],
  "internships": [
    { "company": string, "role": string, "duration": string, "summary": string, "responsibilities": string[], "achievements": string[], "technologies": string[], "metrics": string[] }
  ],
  "projects": [
    { "name": string, "summary": string, "description": string, "technologies": string[], "metrics": string[] }
  ],
  "technicalSkills": string[] (programming languages, frameworks, cloud, databases, tools, ML/AI),
  "softSkills": string[] (STAR communication, ownership, leadership, etc.),
  "technologies": string[] (specific tools and technologies used),
  "certifications": string[] (certifications or credentials),
  "achievements": string[] (awards, hackathons, publications, quantifiable metric outcomes),
  "domains": string[] (e.g. Quick-Commerce, E-Commerce, FinTech, AI/ML, Cloud Infrastructure, Telecommunications, Enterprise SaaS, Distributed Systems)
}

Do NOT wrap the output in markdown codeblocks. Output raw valid JSON only.`;

    try {
      const completion = await executeChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract the candidate profile from this resume text:\n\n${rawText.slice(0, 15000)}` },
        ],
        temperature: 0.1,
        responseFormat: 'json_object',
        timeoutMs: PROFILE_AI_TIMEOUT_MS,
        maxRetries: 0,
      });

      const rawContent = completion.choices[0]?.message?.content || '';
      const cleanJson = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      const candidateProfile = normalizeResumeProfile(parsed);

      const hasContent =
        (candidateProfile.basics.fullName && candidateProfile.basics.fullName.toLowerCase() !== 'candidate') ||
        candidateProfile.education.length > 0 ||
        candidateProfile.workExperience.length > 0 ||
        candidateProfile.projects.length > 0 ||
        candidateProfile.technicalSkills.length > 0;

      if (hasContent) {
        normalized = candidateProfile;
        source = 'ai';
        console.log(`[Resume] AI parser succeeded`);
      }
    } catch (llmError: any) {
      // Section 11: LLM error must not break onboarding; fall back to deterministic parser
      console.warn(`[Resume] LLM extraction error (${llmError?.message || llmError}), activating deterministic fallback parser`);
    }

    // 2. Deterministic Heuristic Fallback (Section 12)
    if (!normalized) {
      console.log(`[Resume] Running deterministic local fallback parser...`);
      const fallback = parseResumeText(rawText);
      normalized = normalizeResumeProfile(fallback);
      source = 'heuristic';
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
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: 'ok',
      profile: normalized,
      source,
      diagnostic,
    });
  } catch (error: any) {
    console.error('[Resume] Error processing resume upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to process resume' }, { status: 500 });
  }
}
