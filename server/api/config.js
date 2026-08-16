// GET /api/config — remote settings the app reads at startup, so things
// like turning MuscleWiki videos off (e.g. if the subscription lapses)
// don't require shipping a new build. Cached at the CDN for 5 minutes.
import { withGuards, json } from '../lib/guards.js';

async function handler(_req, res) {
  return json(
    res,
    200,
    {
      // Feature switches
      muscleWikiVideos: process.env.DISABLE_MW_VIDEOS !== '1',
      ambientClips: true,
      // Minimum app version that should keep talking to this API
      minAppVersion: '1.0.0',
      // Message shown in-app when set (e.g. maintenance notice)
      notice: process.env.APP_NOTICE || null,
    },
    300,
  );
}

export default withGuards(handler, { methods: ['GET'] });
