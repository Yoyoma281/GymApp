// MuscleWiki stream URLs require a short-lived media token (~15 min).
// Tokens are minted by a tiny server endpoint that holds the API key
// (the key itself must never ship in the app). Configure it via
// EXPO_PUBLIC_MW_TOKEN_URL; without it the app falls back to images.

const TOKEN_ENDPOINT = process.env.EXPO_PUBLIC_MW_TOKEN_URL;

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

export function isMuscleWikiUrl(url: string): boolean {
  return url.startsWith('https://api.musclewiki.com/stream/');
}

async function fetchToken(): Promise<string | null> {
  if (!TOKEN_ENDPOINT) return null;
  try {
    const res = await fetch(TOKEN_ENDPOINT, { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string; expires_in: number };
    cached = {
      token: data.token,
      expiresAt: Date.now() + Math.max(data.expires_in - 60, 60) * 1000,
    };
    return data.token;
  } catch {
    return null;
  }
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
