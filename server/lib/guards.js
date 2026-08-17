// Shared helpers: CORS, method checks, a light per-IP rate limit, and
// JSON responses with CDN cache headers.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map(); // ip -> { count, resetAt }

export function json(res, status, body, sMaxAge = 0) {
  if (sMaxAge > 0) {
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${sMaxAge}, stale-while-revalidate=${Math.floor(sMaxAge / 2)}`,
    );
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function rateLimited(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (hits.size > 5000) hits.clear(); // crude bound on memory
  return entry.count > MAX_PER_WINDOW;
}

// Shared app key: the app sends it as x-app-key. It's shipped inside the
// app so a determined attacker can extract it — the point is to stop
// casual/scripted abuse of the MuscleWiki quota, alongside rate limiting.
// Enforced only when APP_KEY is configured, so setting it never breaks a
// deployment mid-rollout.
function unauthorized(req) {
  const expected = process.env.APP_KEY;
  if (!expected) return false;
  // Accept the key from either place: a custom header triggers a CORS
  // preflight on web, so the app can also pass it as a query parameter.
  const given = req.headers['x-app-key'] ?? req.query?.app_key;
  return given !== expected;
}

export function withGuards(handler, { methods = ['GET'], requireAppKey = false } = {}) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-key');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (!methods.includes(req.method)) {
      return json(res, 405, { error: `method ${req.method} not allowed` });
    }
    if (rateLimited(req)) {
      return json(res, 429, { error: 'rate limit exceeded, slow down' });
    }
    if (requireAppKey && unauthorized(req)) {
      return json(res, 401, { error: 'missing or invalid app key' });
    }
    try {
      return await handler(req, res);
    } catch (err) {
      return json(res, 502, { error: String(err?.message ?? err) });
    }
  };
}
