// Where the app's small backend lives (see server/ and its README).
//
// EXPO_PUBLIC_API_BASE overrides it; otherwise the app targets the
// cached API and falls back to the original token-only deployment, so
// video playback keeps working while the new project's environment
// variable and deployment protection are being set up.

import { Platform } from 'react-native';

const CONFIGURED = process.env.EXPO_PUBLIC_API_BASE;

export const API_BASES: string[] = [
  ...(CONFIGURED ? [CONFIGURED] : []),
  'https://dojofit-api-shais-projects-f6bbc652.vercel.app',
  'https://dojofit-token-shais-projects-f6bbc652.vercel.app',
];

// Shared key identifying this app to the backend. Not a real secret (it
// ships inside the app); it exists so the public endpoint can't be
// trivially scripted against, alongside the server's rate limiting.
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;

// On web a custom header triggers a CORS preflight, which fails against
// any deployment that hasn't allow-listed it — so the browser sends the
// key in the query string only (see withKey below). Native has no
// preflight, so the header is used there.
export function apiHeaders(): Record<string, string> {
  if (!APP_KEY || Platform.OS === 'web') return {};
  return { 'x-app-key': APP_KEY };
}

// The key also rides as a query parameter: a custom header triggers a
// CORS preflight, and any deployment that predates the header being
// allow-listed would reject it on web. The server accepts either.
export function withKey(url: string): string {
  if (!APP_KEY) return url;
  return `${url}${url.includes('?') ? '&' : '?'}app_key=${encodeURIComponent(APP_KEY)}`;
}

/** Base that last answered successfully, tried first next time. */
let preferred: string | null = null;

export function markWorking(base: string) {
  preferred = base;
}

export function orderedBases(): string[] {
  if (!preferred) return API_BASES;
  return [preferred, ...API_BASES.filter((b) => b !== preferred)];
}
