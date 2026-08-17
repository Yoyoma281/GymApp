// Resolve a real technique tutorial for every drill via the YouTube Data
// API, and write the video id into the catalog as `tutorialId`.
//
// The API key is used here only, at build time — the app embeds YouTube's
// official player with the stored id and needs no key at runtime.
//
// Quota: search costs 100 units and the free daily allowance is 10,000,
// so ~95 drills a day. Results are cached in scripts/.youtube-cache.json
// and the script resumes where it left off, so run it daily until done
// (or raise the quota in the Google Cloud console).
//
// Usage: YOUTUBE_API_KEY=... node scripts/fetch-technique-videos.mjs
//        ... --limit 90     cap searches this run (default 90)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CACHE = path.join(here, '.youtube-cache.json');

const KEY =
  process.env.YOUTUBE_API_KEY ||
  (fs.existsSync(path.join(here, '.youtube-key'))
    ? fs.readFileSync(path.join(here, '.youtube-key'), 'utf8').trim()
    : '');
if (!KEY) {
  console.error('YOUTUBE_API_KEY is not set (and scripts/.youtube-key is missing)');
  process.exit(1);
}

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : 90;

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
let searches = 0;
let quotaExhausted = false;

// Channels/titles that are compilations or highlight reels rather than
// instruction — a tutorial should teach the movement.
// Caught real mismatches on manual review: fight-promo hype clips ("before
// fight", "vs"), video-game tutorials mistaken for the real sport (NBA 2K),
// and stunt/trick channels riding the same keywords as real instruction.
const BAD_TITLE =
  /highlight|knockout|compilation|best of|montage|edit|shorts? compilation|funny|fail|vs\.?\s|before (the )?fight|workout before|nba 2k|2k\d\d|trick shot|around corners|#shorts$/i;
const GOOD_TITLE = /tutorial|how to|technique|lesson|basics|step by step|explained|drill|guide|breakdown|learn/i;

async function search(query) {
  if (query in cache) return cache[query];
  if (quotaExhausted) return null;

  const url =
    'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video' +
    '&maxResults=8&videoEmbeddable=true&safeSearch=strict&relevanceLanguage=en' +
    `&q=${encodeURIComponent(query)}&key=${KEY}`;
  const res = await fetch(url);
  searches += 1;
  const data = await res.json();

  if (data.error) {
    const reason = data.error.errors?.[0]?.reason ?? '';
    if (/quota/i.test(reason) || data.error.code === 403) {
      console.warn(`quota exhausted after ${searches} searches — rerun tomorrow to continue`);
      quotaExhausted = true;
      return null;
    }
    throw new Error(data.error.message);
  }

  let best = null;
  let bestScore = -Infinity;
  for (const [index, item] of (data.items ?? []).entries()) {
    const title = item.snippet?.title ?? '';
    if (BAD_TITLE.test(title)) continue;
    // Prefer instructional titles, and earlier (more relevant) results.
    const score = (GOOD_TITLE.test(title) ? 3 : 0) - index * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = {
        id: item.id?.videoId,
        title,
        channel: item.snippet?.channelTitle ?? '',
      };
    }
  }
  cache[query] = best ?? null;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return cache[query];
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

let resolved = 0;
let missing = 0;

for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;

  for (const drill of activity.drills) {
    if (drill.tutorialId) continue; // already resolved
    if (quotaExhausted && !(buildQuery(activity, drill) in cache)) continue;

    const query = buildQuery(activity, drill);
    let hit;
    try {
      hit = await search(query);
    } catch (err) {
      console.warn(`${activity.id}/${drill.id}: ${err.message}`);
      continue;
    }
    if (hit?.id) {
      drill.tutorialId = hit.id;
      drill.tutorialTitle = hit.title;
      drill.tutorialChannel = hit.channel;
      resolved += 1;
      changed = true;
    } else if (!quotaExhausted) {
      missing += 1;
    }
    if (searches >= LIMIT) {
      if (changed) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
      console.log(`hit the ${LIMIT}-search cap — rerun to continue`);
      console.log(`resolved ${resolved} drills this run (${searches} searches)`);
      process.exit(0);
    }
  }

  if (changed) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  const done = activity.drills.filter((d) => d.tutorialId).length;
  console.log(`${activity.id}: ${done}/${activity.drills.length} drills have a tutorial`);
}

function buildQuery(activity, drill) {
  // "karate mawashi geri roundhouse kick tutorial" — the native name plus
  // the plain-language one gives YouTube the best chance of a real lesson.
  const parts = [activity.name, drill.name];
  if (drill.alt && drill.alt.toLowerCase() !== drill.name.toLowerCase()) parts.push(drill.alt);
  parts.push('tutorial technique');
  return parts.join(' ').toLowerCase();
}

console.log(`resolved ${resolved} drills this run (${searches} searches, ${missing} with no good match)`);
