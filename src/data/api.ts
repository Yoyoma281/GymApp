// Where the app's small backend lives (see server/ and its README).
//
// EXPO_PUBLIC_API_BASE overrides it; otherwise the app targets the
// cached API and falls back to the original token-only deployment, so
// video playback keeps working while the new project's environment
// variable and deployment protection are being set up.

const CONFIGURED = process.env.EXPO_PUBLIC_API_BASE;

export const API_BASES: string[] = [
  ...(CONFIGURED ? [CONFIGURED] : []),
  'https://dojofit-api-shais-projects-f6bbc652.vercel.app',
  'https://dojofit-token-shais-projects-f6bbc652.vercel.app',
];

/** Base that last answered successfully, tried first next time. */
let preferred: string | null = null;

export function markWorking(base: string) {
  preferred = base;
}

export function orderedBases(): string[] {
  if (!preferred) return API_BASES;
  return [preferred, ...API_BASES.filter((b) => b !== preferred)];
}
