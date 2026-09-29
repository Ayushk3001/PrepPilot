import { NextRequest, NextResponse } from 'next/server';
import { normalizeResumeProfile } from '@/lib/resumeParser';

// In-memory server profile store for the current session
let currentServerProfile: any = null;

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    profile: currentServerProfile,
    source: currentServerProfile ? 'saved' : 'empty',
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    currentServerProfile = normalizeResumeProfile(body);
    return NextResponse.json({
      status: 'ok',
      profile: currentServerProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update profile' }, { status: 400 });
  }
}
