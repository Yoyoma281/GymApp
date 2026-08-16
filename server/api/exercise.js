// GET /api/exercise?name=barbell%20squat
//
// Cached MuscleWiki lookup for exercises that aren't in the app's bundled
// catalog (e.g. content added after a release). Results are cached in the
// lambda and at the CDN for a day, so repeated lookups of the same name
// cost nothing — the API key is only spent on genuinely new names.
import { withGuards, json } from '../lib/guards.js';

const DAY = 24 * 60 * 60;
const memo = new Map(); // normalized name -> payload

async function mw(pathname, key) {
  const res = await fetch(`https://api.musclewiki.com${pathname}`, {
    headers: { 'X-API-Key': key },
  });
  if (!res.ok) throw new Error(`musclewiki ${res.status}`);
  return res.json();
}

async function handler(req, res) {
  const key = process.env.MUSCLEWIKI_API_KEY;
  if (!key) return json(res, 500, { error: 'MUSCLEWIKI_API_KEY env var is not configured' });

  const name = String(req.query?.name ?? '').trim();
  if (!name) return json(res, 400, { error: 'name query parameter is required' });

  const cacheKey = name.toLowerCase();
  if (memo.has(cacheKey)) {
    res.setHeader('x-cache', 'HIT');
    return json(res, 200, memo.get(cacheKey), DAY);
  }

  const search = await mw(`/exercises?search=${encodeURIComponent(name)}&limit=5`, key);
  const hit = search.results?.[0];
  if (!hit) {
    const miss = { found: false, name };
    memo.set(cacheKey, miss);
    return json(res, 200, miss, DAY);
  }

  const detail = await mw(`/exercises/${hit.id}`, key);
  const payload = {
    found: true,
    id: detail.id,
    name: detail.name,
    videos: detail.videos ?? [],
    muscles: detail.primary_muscles ?? [],
    difficulty: detail.difficulty ?? null,
    grips: detail.grips ?? [],
    steps: detail.steps ?? [],
  };
  memo.set(cacheKey, payload);
  res.setHeader('x-cache', 'MISS');
  return json(res, 200, payload, DAY);
}

export default withGuards(handler, { methods: ['GET'] });
