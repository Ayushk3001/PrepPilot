import { NextRequest, NextResponse } from 'next/server';
import { runMultiAgentInterviewCoaching } from '@/agents/orchestrator';
import { CandidateProfile, InterviewQuestion, SpeechMetrics } from '@/types/interview';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      candidateProfile,
      question,
      candidateResponse,
      speechMetrics,
      apiKey
    } = body as {
      candidateProfile: CandidateProfile;
      question: InterviewQuestion;
      candidateResponse: string;
      speechMetrics?: SpeechMetrics;
      apiKey?: string;
    };

    if (!question || !candidateResponse) {
      return NextResponse.json(
        { error: 'Question and candidate response are required.' },
        { status: 400 }
      );
    }

    const defaultProfile: CandidateProfile = candidateProfile || {
      id: 'default-cand',
      fullName: 'Prodapt Engineering Candidate',
      targetRole: question.role || 'Fullstack Software Engineer',
      experienceYears: 3,
      keySkills: ['Distributed Systems', 'Microservices', 'TypeScript'],
      bio: 'Aspiring engineer preparing for technical rounds.'
    };

    const result = await runMultiAgentInterviewCoaching(
      defaultProfile,
      question,
      candidateResponse,
      speechMetrics,
      apiKey
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Evaluation Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to process multi-agent evaluation', details: String(error) },
      { status: 500 }
    );
  }
}
