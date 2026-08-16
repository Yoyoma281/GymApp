// Attach an ambient stock clip to every drill via the Pexels video API.
//
// Pexels has little footage for specific techniques ("mawashi geri"), so
// searching per drill mostly returns the same generic sport clip. Instead
// we pull a POOL of results per (sport, technique group) plus a sport-wide
// pool, then hand each drill a clip no other drill in that sport is using.
// That keeps clips on-topic while making them distinct per drill.
//
// Usage: PEXELS_API_KEY=... node scripts/fetch-drill-videos.mjs
// Search results are cached in scripts/.pexels-pool.json; the free tier
// allows 200 requests/hour and the script resumes where it stopped.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CACHE = path.join(here, '.pexels-pool.json');
const PER_PAGE = 15;

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error('PEXELS_API_KEY is not set (free key: https://www.pexels.com/api/)');
  process.exit(1);
}

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
let calls = 0;

/** Returns an array of clips for a query, cached. */
async function searchPool(query) {
  if (query in cache) return cache[query];
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${PER_PAGE}&orientation=landscape`,
    { headers: { Authorization: KEY } },
  );
  calls += 1;
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const data = await res.json();
  const clips = [];
  for (const video of data.videos ?? []) {
    const file =
      (video.video_files ?? [])
        .filter((f) => f.file_type === 'video/mp4' && f.width >= 640 && f.width <= 1400)
        .sort((a, b) => a.width - b.width)
        .at(-1) ?? null;
    if (file) {
      clips.push({
        url: file.link,
        poster: video.image,
        credit: `${video.user?.name ?? 'Pexels'} / Pexels`,
      });
    }
  }
  cache[query] = clips;
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  return clips;
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

let assigned = 0;
let rateLimited = false;

for (const f of files) {
  if (rateLimited) break;
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  const used = new Set();
  let changed = false;

  for (const drill of activity.drills) {
    // Most specific pool first, then the sport-wide pool as backup.
    const queries = [
      `${activity.name} ${drill.group}`.toLowerCase(),
      activity.name.toLowerCase(),
    ];
    let chosen = null;
    try {
      for (const q of queries) {
        const pool = await searchPool(q);
        chosen = pool.find((c) => !used.has(c.url)) ?? null;
        if (chosen) break;
        // pool exhausted for this sport — reuse its least-used entry
        if (!chosen && pool.length && q === queries.at(-1)) chosen = pool[0];
      }
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.warn(`rate limit reached after ${calls} calls — rerun to continue`);
        rateLimited = true;
        break;
      }
      console.warn(`${activity.id}/${drill.id}: ${err.message}`);
      continue;
    }
    if (chosen) {
      used.add(chosen.url);
      drill.clipUrl = chosen.url;
      drill.clipPoster = chosen.poster;
      drill.clipCredit = chosen.credit;
      assigned += 1;
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  const unique = new Set(activity.drills.map((d) => d.clipUrl).filter(Boolean)).size;
  console.log(`${activity.id}: ${unique} unique clips / ${activity.drills.length} drills`);
}

console.log(`assigned ${assigned} drills (${calls} API searches this run)`);
if (rateLimited) process.exit(2);
