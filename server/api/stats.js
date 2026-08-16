// GET /api/stats — aggregate usage counters.
//
// Reads durable counters from KV when configured, otherwise reports the
// in-memory tally for this lambda instance (resets on cold start).
// Requires the app key, so the numbers aren't public.
import { withGuards, json } from '../lib/guards.js';
import { tally } from './events.js';

async function kvRead() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const scan = await fetch(`${url}/scan/0/match/dojofit:*/count/500`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!scan.ok) return null;
  const [, keys] = (await scan.json()).result ?? [null, []];
  if (!keys?.length) return {};
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(keys.map((k) => ['GET', k])),
  });
  if (!res.ok) return null;
  const values = await res.json();
  const out = {};
  keys.forEach((k, i) => {
    out[k.replace(/^dojofit:/, '')] = Number(values[i]?.result ?? 0);
  });
  return out;
}

async function handler(_req, res) {
  const durable = await kvRead().catch(() => null);
  const counters = durable ?? Object.fromEntries(tally);
  const sortedTop = (prefix) =>
    Object.entries(counters)
      .filter(([k]) => k.startsWith(`${prefix}:`))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, v]) => ({ name: k.slice(prefix.length + 1), count: v }));

  return json(res, 200, {
    source: durable ? 'kv' : 'memory',
    totals: {
      appOpens: counters.app_open ?? 0,
      sportOpens: counters.sport_open ?? 0,
      drillOpens: counters.drill_open ?? 0,
      videoPlays: counters.video_play ?? 0,
      searches: counters.search ?? 0,
    },
    topSports: sortedTop('sport_open'),
    topDrills: sortedTop('drill_open'),
  });
}

export default withGuards(handler, { methods: ['GET'], requireAppKey: true });
