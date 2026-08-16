// Attach an ambient stock clip to every drill via the Pexels video API.
// One clip per (sport, technique group) — e.g. "karate kicks" — written
// into each drill as clipUrl/clipPoster/clipCredit. Pexels video files
// are public CDN mp4s, so playback needs no key or token at runtime;
// PEXELS_API_KEY is needed only when running this script.
//
// Usage: PEXELS_API_KEY=... node scripts/fetch-drill-videos.mjs
// Responses are cached in scripts/.pexels-cache.json (delete an entry
// to re-search it). Rate limit: 200 requests/hour on the free tier.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CACHE = path.join(here, '.pexels-cache.json');

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error('PEXELS_API_KEY is not set (free key: https://www.pexels.com/api/)');
  process.exit(1);
}

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};

async function searchClip(query) {
  if (query in cache) return cache[query];
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: KEY } },
  );
  if (res.status === 429) throw new Error('Pexels rate limit hit — re-run later, cache keeps progress');
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const data = await res.json();
  let best = null;
  for (const video of data.videos ?? []) {
    // prefer a modest-resolution mp4 (mobile-friendly bandwidth)
    const file =
      (video.video_files ?? [])
        .filter((f) => f.file_type === 'video/mp4' && f.width >= 640 && f.width <= 1400)
        .sort((a, b) => a.width - b.width)
        .at(-1) ?? null;
    if (file) {
      best = {
        url: file.link,
        poster: video.image,
        credit: `${video.user?.name ?? 'Pexels'} / Pexels`,
      };
      break;
    }
  }
  cache[query] = best;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return best;
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

let assigned = 0;
let searched = 0;
for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const drill of activity.drills) {
    const query = `${activity.name} ${drill.group}`.toLowerCase();
    let clip;
    try {
      const had = query in cache;
      clip = await searchClip(query);
      if (!had) searched += 1;
      // group query found nothing → fall back to the sport name alone
      if (!clip) clip = await searchClip(activity.name.toLowerCase());
    } catch (err) {
      console.warn(`${activity.id}/${drill.id}: ${err.message}`);
      if (/rate limit/.test(err.message)) {
        fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
        process.exit(2);
      }
      continue;
    }
    if (clip) {
      drill.clipUrl = clip.url;
      drill.clipPoster = clip.poster;
      drill.clipCredit = clip.credit;
      assigned += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  console.log(`${activity.id}: done`);
}
console.log(`assigned clips to ${assigned} drills (${searched} API searches this run)`);
