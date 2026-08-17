// Attach MuscleWiki stretch demonstrations to the stretches listed on
// each drill.
//
// Our stretches are written the way a coach says them ("90/90 hip
// switch", "Couch stretch", "Lying figure-4"); MuscleWiki names them by
// the muscle ("Glute Hip Rotator Stretch Variation Two"). Direct name
// matching therefore fails, so we map each of our stretches to the body
// part it targets and pick a MuscleWiki stretch for that part.
//
// Usage: MUSCLEWIKI_API_KEY=... node scripts/enrich-stretches.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CATALOG = path.join(here, '.musclewiki-catalog.json');
const CACHE = path.join(here, '.musclewiki-stretch-cache.json');
const DETAILS = path.join(GEN_DIR, 'exercise-details.json');

const KEY =
  process.env.MUSCLEWIKI_API_KEY ||
  fs.readFileSync(path.join(here, '.musclewiki-key'), 'utf8').trim();

async function mw(pathname) {
  const res = await fetch(`https://api.musclewiki.com${pathname}`, {
    headers: { 'X-API-Key': KEY },
  });
  if (!res.ok) throw new Error(`${pathname}: ${res.status}`);
  return res.json();
}

// Body part a stretch targets, detected from how coaches name it.
// Ordered: the first pattern that matches wins, so specific before general.
const BODY_PART_RULES = [
  [/90\s*\/?\s*90|ninety/i, 'ninety ninety hip'],
  [/couch|hip flexor|lunge stretch|kneeling hip/i, 'hip flexor'],
  [/figure.?4|pigeon|piriformis|glute/i, 'glute hip rotator'],
  [/hamstring|forward fold|toe touch|straddle|pike/i, 'hamstring'],
  [/quad|thigh stretch/i, 'quads'],
  [/calf|gastroc|achilles/i, 'gastrocnemius'],
  [/soleus/i, 'soleus'],
  [/butterfly|adductor|groin|frog|straddle stretch/i, 'adductor'],
  [/lat |lat$|lats/i, 'lats'],
  [/pec|chest|doorway/i, 'chest'],
  [/shoulder|cross.?body|sleeper/i, 'shoulders'],
  [/trap|neck|levator/i, 'traps'],
  [/tricep/i, 'triceps'],
  [/bicep/i, 'biceps'],
  [/wrist|forearm|finger/i, 'forearms'],
  [/cobra|spinal|thoracic|cat.?cow|twist|thread the needle/i, 'lower back'],
  [/child.?s pose|lower back|low back|hip hinge/i, 'lower back'],
  [/ab |abdominal|core stretch/i, 'abdominals'],
  [/hip|deep squat|malasana/i, 'glute hip rotator'],
];

function bodyPart(name) {
  for (const [pattern, part] of BODY_PART_RULES) {
    if (pattern.test(name)) return part;
  }
  return null;
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const stretches = catalog.filter((e) => /stretch|pose|prayer|bounces/i.test(e.name));

// Group MuscleWiki stretches by the body part in their name.
const byPart = new Map();
for (const ex of stretches) {
  const key = ex.name.toLowerCase();
  for (const [, part] of BODY_PART_RULES) {
    if (key.includes(part)) {
      if (!byPart.has(part)) byPart.set(part, []);
      byPart.get(part).push(ex);
      break;
    }
  }
}
console.log(`indexed ${stretches.length} MuscleWiki stretches across ${byPart.size} body parts`);

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const details = JSON.parse(fs.readFileSync(DETAILS, 'utf8'));
let calls = 0;

async function detailFor(ex) {
  if (cache[ex.id]) return cache[ex.id];
  const d = await mw(`/exercises/${ex.id}`);
  calls += 1;
  const main = (d.videos ?? []).find((v) => v.gender === 'male') ?? d.videos?.[0];
  cache[ex.id] = {
    name: d.name,
    videoUrl: main?.url ?? null,
    videos: (d.videos ?? []).map((v) => ({ url: v.url, gender: v.gender, angle: v.angle })),
    muscles: d.primary_muscles ?? [],
    difficulty: d.difficulty ?? null,
    steps: d.steps ?? [],
    source: 'musclewiki',
  };
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  return cache[ex.id];
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

// Spread variations so sibling stretches don't all show the same clip.
const rotation = new Map();
let attached = 0;
let plain = 0;

for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const drill of activity.drills) {
    const out = [];
    for (const s of drill.stretches) {
      const name = typeof s === 'string' ? s : s.name;
      const part = bodyPart(name);
      const pool = part ? byPart.get(part) : null;
      if (!pool?.length) {
        out.push({ name });
        plain += 1;
        continue;
      }
      const i = rotation.get(part) ?? 0;
      rotation.set(part, i + 1);
      const chosen = pool[i % pool.length];
      const detail = await detailFor(chosen);
      const detailId = `mw-${chosen.id}`;
      details[detailId] = detail;
      out.push({ name, detailId });
      attached += 1;
    }
    drill.stretches = out;
  }

  fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  console.log(`${activity.id}: done`);
}

fs.writeFileSync(DETAILS, JSON.stringify(details, null, 2) + '\n');
console.log(`attached demos to ${attached} stretches (${plain} left as text), ${calls} API calls`);
