// Apply the reviewed exercise corrections from .review/result-*.json.
//
// Every proposal is re-validated here rather than trusted: the id must have
// been one of the candidates offered for that exact name, and must resolve to
// a real catalog entry. A review pass that invents an id would otherwise
// replace a wrong video with a broken one, which is worse.
//
// Usage: node scripts/apply-review.mjs [--dry]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const GEN_DIR = path.join(ROOT, 'src', 'data', 'generated');
const REVIEW = path.join(ROOT, '.review');
const DETAILS_FILE = path.join(GEN_DIR, 'exercise-details.json');
const MW_BASE = 'https://api.musclewiki.com';

const DRY = process.argv.includes('--dry');
const key = fs.existsSync(path.join(here, '.musclewiki-key'))
  ? fs.readFileSync(path.join(here, '.musclewiki-key'), 'utf8').trim()
  : process.env.MUSCLEWIKI_API_KEY;

const details = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(here, '.musclewiki-catalog.json'), 'utf8'));
const mwIds = new Set(catalog.map((e) => `mw-${e.id}`));
const fedCache = JSON.parse(fs.readFileSync(path.join(here, '.fed-cache.json'), 'utf8'));
const fedList = fedCache.exercises ?? fedCache;
const fedById = new Map(
  fedList.map((e) => [`fed-${String(e.name ?? '').replace(/[^A-Za-z0-9]+/g, '_')}`, e]),
);

// What was actually offered for each name, so a proposal can be checked
// against it.
const offered = new Map();
for (const f of fs.readdirSync(REVIEW).filter((f) => /^batch-\d+\.json$/.test(f))) {
  for (const row of JSON.parse(fs.readFileSync(path.join(REVIEW, f), 'utf8'))) {
    offered.set(row.name, new Set(row.candidates.map((c) => c.id)));
  }
}

const proposals = new Map();
const rejected = [];
for (const f of fs.readdirSync(REVIEW).filter((f) => /^result-\d+\.json$/.test(f)).sort()) {
  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(path.join(REVIEW, f), 'utf8'));
  } catch (err) {
    console.warn(`${f}: unparseable (${err.message}) — skipped`);
    continue;
  }
  for (const row of rows) {
    if (!offered.has(row.name)) {
      rejected.push(`${f}: "${row.name}" is not a reviewed name`);
      continue;
    }
    if (row.to !== null) {
      if (!offered.get(row.name).has(row.to)) {
        rejected.push(`${f}: "${row.name}" -> ${row.to} was never a candidate`);
        continue;
      }
      if (!mwIds.has(row.to) && !fedById.has(row.to)) {
        rejected.push(`${f}: "${row.name}" -> ${row.to} is not in any catalog`);
        continue;
      }
    }
    proposals.set(row.name, row.to);
  }
}

console.log(`${proposals.size} validated corrections, ${rejected.length} rejected`);
for (const r of rejected) console.warn(`  reject: ${r}`);

async function ensureDetail(id) {
  if (id === null || details[id]) return;
  if (id.startsWith('mw-')) {
    const res = await fetch(`${MW_BASE}/exercises/${id.slice(3)}`, {
      headers: { 'X-API-Key': key },
    });
    if (!res.ok) throw new Error(`MuscleWiki ${id}: ${res.status}`);
    const d = await res.json();
    const videos = (d.videos ?? []).map((v) => ({ url: v.url, gender: v.gender, angle: v.angle }));
    const main = videos.find((v) => v.gender === 'male' && v.angle === 'front') ?? videos[0];
    details[id] = {
      name: d.name,
      videoUrl: main?.url ?? null,
      videos,
      muscles: d.primary_muscles ?? [],
      secondaryMuscles: d.secondary_muscles ?? [],
      difficulty: d.difficulty ?? null,
      grips: d.grips ?? [],
      steps: d.steps ?? [],
      equipment: d.category ?? null,
      force: d.force ?? null,
      mechanic: d.mechanic ?? null,
      source: 'musclewiki',
    };
  } else {
    const e = fedById.get(id);
    details[id] = {
      name: e.name,
      imageUrl: (e.images ?? [])[0]
        ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${e.images[0]}`
        : null,
      videoUrl: null,
      muscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      difficulty: e.level ?? null,
      equipment: e.equipment ?? null,
      steps: e.instructions ?? [],
      source: 'free-exercise-db',
    };
  }
}

// Same muscle-name table as remap-exercises.mjs: body maps are derived from
// the entry actually shown, never from a sibling wger match.
const MUSCLE_IDS = {
  biceps: 1, 'long head bicep': 1, 'short head bicep': 1, brachialis: 13,
  shoulders: 2, 'anterior deltoid': 2, 'posterior deltoid': 2, 'lateral deltoid': 2,
  'front shoulders': 2, 'rear shoulders': 2,
  'serratus anterior': 3,
  chest: 4, 'upper pectoralis': 4, 'mid and lower chest': 4,
  triceps: 5, 'long head tricep': 5,
  abs: 6, abdominals: 6, 'upper abdominals': 6, 'lower abdominals': 6,
  obliques: 14, 'obliquus externus abdominis': 14,
  calves: 7, gastrocnemius: 7, soleus: 15,
  glutes: 8, 'gluteus maximus': 8, 'gluteus medius': 8,
  traps: 9, trapezius: 9, 'traps (mid-back)': 9, 'middle back': 9,
  quads: 10, quadriceps: 10, 'rectus femoris': 10,
  hamstrings: 11, 'lateral hamstrings': 11,
  lats: 12,
};
const FRONT = new Set([1, 2, 3, 4, 6, 10, 13, 14]);
const toMuscleIds = (names) => {
  const out = [];
  const seen = new Set();
  for (const n of names ?? []) {
    const id = MUSCLE_IDS[String(n).toLowerCase().trim()];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, front: FRONT.has(id) });
  }
  return out;
};

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

let applied = 0;
let cleared = 0;
for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let dirty = false;
  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      if (!proposals.has(ex.name)) continue;
      const to = proposals.get(ex.name);
      if (ex.detailId === to || (to === null && !ex.detailId)) continue;
      await ensureDetail(to);
      if (to === null) {
        delete ex.detailId;
        cleared += 1;
      } else {
        ex.detailId = to;
        applied += 1;
      }
      dirty = true;
    }
  }
  if (dirty && !DRY) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
}

for (const entry of Object.values(details)) {
  const primary = toMuscleIds(entry.muscles);
  entry.muscleIds = primary;
  entry.secondaryMuscleIds = toMuscleIds(entry.secondaryMuscles).filter(
    (m) => !primary.some((p) => p.id === m.id),
  );
}
if (!DRY) fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2) + '\n');

console.log(`${applied} exercise slots relinked, ${cleared} cleared to text-only`);
