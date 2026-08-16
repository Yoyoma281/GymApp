// POST /api/token — mint a MuscleWiki media playback token.
//
// Quota protection: MuscleWiki tokens are app-scoped (not per user), so
// one token serves everyone. We cache it in the lambda and let Vercel's
// CDN serve the same response to all callers for 10 minutes, which turns
// "one call per user per 15 min" into "one call per 10 min, globally".
import { withGuards, json } from '../lib/guards.js';

const TTL_MS = 10 * 60 * 1000; // refresh before the ~15 min expiry
let cached = null; // { body, fetchedAt }

async function handler(req, res) {
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!key) return json(res, 500, { error: 'MUSCLEWIKI_API_KEY env var is not configured' });

  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    res.setHeader('x-cache', 'HIT');
    return json(res, 200, cached.body, 600);
  }

  const upstream = await fetch('https://api.musclewiki.com/media/token', {
    method: 'POST',
    headers: { 'X-API-Key': key },
  });
  const body = await upstream.json().catch(() => null);
  if (!upstream.ok || !body?.token) {
    return json(res, upstream.status || 502, body ?? { error: 'token mint failed' });
  }

  cached = { body, fetchedAt: Date.now() };
  res.setHeader('x-cache', 'MISS');
  return json(res, 200, body, 600);
}

export default withGuards(handler, { methods: ['POST', 'GET'] });
