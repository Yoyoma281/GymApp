// GET /api/health — quick check that the API and its key are wired up.
import { withGuards, json } from '../lib/guards.js';

async function handler(_req, res) {
  return json(res, 200, {
    ok: true,
    hasMuscleWikiKey: Boolean(process.env.MUSCLEWIKI_API_KEY),
    time: new Date().toISOString(),
  });
}

export default withGuards(handler, { methods: ['GET'] });
