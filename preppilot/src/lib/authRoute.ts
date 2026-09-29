'use client';

import { TOKEN_KEY, USER_KEY, PROFILE_KEY } from './api';

/**
 * Returns the destination route when a user clicks 'Start Practicing'
 * based on their authentication and onboarding state:
 * - Unauthenticated -> /signup
 * - Logged in without a completed/confirmed profile -> /onboarding/resume
 * - Logged in with confirmed profile -> /app/practice
 */
import { isCorruptOrGarbageProfile } from './resumeParser';

export function getStartPracticingRoute(): string {
  if (typeof window === 'undefined') return '/signup';

  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) {
    return '/signup';
  }

  const profileConfirmed = localStorage.getItem('cadence_profile_confirmed') === 'true';
  const profileRaw = localStorage.getItem(PROFILE_KEY);

  if (profileRaw) {
    try {
      const p = JSON.parse(profileRaw);
      if (isCorruptOrGarbageProfile(p)) {
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem('cadence_profile_confirmed');
        localStorage.removeItem('cadence_profile_source');
        localStorage.removeItem('cadence_resume_diagnostic');
        return '/onboarding/resume';
      }
      const hasDetails = (p.projects?.length > 0 || p.experience?.length > 0 || (p.summary && p.summary.length > 20));
      if (profileConfirmed || hasDetails) {
        return '/app/practice';
      }
    } catch {
      localStorage.removeItem(PROFILE_KEY);
    }
  }

  return '/onboarding/resume';
}
