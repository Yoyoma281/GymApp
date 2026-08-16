// POST /api/events — anonymous usage analytics.
//
// Storage tiers, in order of preference:
//   1. Upstash/Vercel KV, if KV_REST_API_URL + KV_REST_API_TOKEN are set
//      (durable counters, survives cold starts).
//   2. Vercel runtime logs — every batch is logged as one JSON line, so
//      events are queryable in the dashboard even with no store attached.
// An in-memory tally is always kept so /api/stats can answer quickly.
//
// No personal data: events carry an anonymous install id the app
// generates itself, an event name, and a few string properties.
import { withGuards, json } from '../lib/guards.js';

const ALLOWED = new Set([
  'app_open',
  'sport_open',
  'drill_open',
  'exercise_open',
  'video_play',
  'video_complete',
  'search',
  'credits_open',
]);

export const tally = new Map(); // "event" or "event:prop" -> count

function bump(key, by = 1) {
  tally.set(key, (tally.get(key) ?? 0) + by);
}

async function kvIncr(keys) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  // Upstash REST pipeline: one round trip for the whole batch.
  const commands = keys.map((k) => ['INCR', `dojofit:${k}`]);
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  return res.ok;
}

async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'body must be JSON' });
    }
  }
  const events = Array.isArray(body?.events) ? body.events.slice(0, 50) : null;
  if (!events) return json(res, 400, { error: 'events array is required' });

  const keys = [];
  const accepted = [];
  for (const e of events) {
    const name = String(e?.name ?? '');
    if (!ALLOWED.has(name)) continue;
    const target = typeof e?.target === 'string' ? e.target.slice(0, 64) : null;
    keys.push(name);
    bump(name);
    if (target) {
      keys.push(`${name}:${target}`);
      bump(`${name}:${target}`);
    }
    accepted.push({
      name,
      target,
      install: typeof e?.install === 'string' ? e.install.slice(0, 40) : null,
      platform: typeof e?.platform === 'string' ? e.platform.slice(0, 16) : null,
      appVersion: typeof e?.appVersion === 'string' ? e.appVersion.slice(0, 16) : null,
      at: new Date().toISOString(),
    });
  }

  if (accepted.length) {
    // One structured line per batch — greppable in Vercel's runtime logs.
    console.log(JSON.stringify({ type: 'dojofit_events', events: accepted }));
    await kvIncr(keys).catch(() => {});
  }

  return json(res, 200, { accepted: accepted.length });
}

export default withGuards(handler, { methods: ['POST'], requireAppKey: true });
