import { NextRequest, NextResponse } from 'next/server';
import { selectOrGenerateQuestion } from '@/agents/questionAgent';
import { CandidateProfile, StageType } from '@/types/interview';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, stage, apiKey, forceDynamic } = body as {
      profile: CandidateProfile;
      stage: StageType;
      apiKey?: string;
      forceDynamic?: boolean;
    };

    const question = await selectOrGenerateQuestion(
      profile,
      stage || 'HR & Culture Screening',
      apiKey,
      forceDynamic
    );

    return NextResponse.json({ question });
  } catch (error) {
    console.error('API Generate Question Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate question', details: String(error) },
      { status: 500 }
    );
  }
}
