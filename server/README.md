# DojoFit API (Vercel)

Small serverless backend for the things the app can't do on-device:
holding the MuscleWiki API key, caching responses so the monthly quota
isn't spent per user, and serving remote config.

Deployed as the Vercel project **dojofit-token**. Required environment
variable: `MUSCLEWIKI_API_KEY` (Project Settings → Environment
Variables; redeploy after changing it).

## Endpoints

| Route | Purpose | Cache |
|---|---|---|
| `POST /api/token` | Mints a MuscleWiki media playback token for video streaming | 10 min, shared by all users |
| `GET /api/exercise?name=…` | Looks up an exercise (videos, muscles, steps) not in the bundled catalog | 24 h per name |
| `GET /api/config` | Feature flags and notices the app reads at startup | 5 min |
| `GET /api/health` | Reports whether the key is configured | none |

## Why caching matters

MuscleWiki tokens are app-scoped, not per-user, so one token works for
everyone. Caching it in the lambda *and* at Vercel's CDN means the app's
entire user base costs roughly **6 API calls per hour** instead of one
per user per session.

Optional env vars: `DISABLE_MW_VIDEOS=1` turns MuscleWiki video playback
off app-wide, `APP_NOTICE` shows a message in the app.

## Deploy

```bash
cd server && npx vercel --prod
```
