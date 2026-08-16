// MuscleWiki stream URLs require a short-lived media token (~15 min).
// Tokens are minted by the app's backend, which holds the API key and
// caches the token so the whole user base costs only a few API calls an
// hour (see server/api/token.js).

import { apiHeaders, markWorking, orderedBases } from './api';

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

export function isMuscleWikiUrl(url: string): boolean {
  return url.startsWith('https://api.musclewiki.com/stream/');
}

async function fetchToken(): Promise<string | null> {
  for (const base of orderedBases()) {
    try {
      const res = await fetch(`${base}/api/token`, { method: 'POST', headers: apiHeaders() });
      if (!res.ok) continue;
      const data = (await res.json()) as { token?: string; expires_in?: number };
      if (!data?.token) continue;
      markWorking(base);
      cached = {
        token: data.token,
        expiresAt: Date.now() + Math.max((data.expires_in ?? 900) - 60, 60) * 1000,
      };
      return data.token;
    } catch {
      // try the next base
    }
  }
  return null;
}

export async function getMediaToken(): Promise<string | null> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  if (!inflight) {
    inflight = fetchToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function resolveVideoUrl(url: string): Promise<string | null> {
  if (!isMuscleWikiUrl(url)) return url;
  const token = await getMediaToken();
  return token ? `${url}?token=${token}` : null;
}
