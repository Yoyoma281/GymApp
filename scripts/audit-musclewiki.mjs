// Audit the MuscleWiki catalog against what DojoFit actually needs.
//
// Downloads the full exercise list once (~19 calls instead of 2 per name),
// then reports:
//   • which of our exercise names have no counterpart there
//   • which fields their API offers that the app isn't storing
//   • coverage by equipment category
//
// Usage: node scripts/audit-musclewiki.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CATALOG = path.join(here, '.musclewiki-catalog.json');
const REPORT = path.join(here, '..', 'MUSCLEWIKI-AUDIT.md');

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

// ── 1. full catalog (cached) ────────────────────────────────────
let catalog;
if (fs.existsSync(CATALOG)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  console.log(`catalog: ${catalog.length} exercises (cached)`);
} else {
  catalog = [];
  let offset = 0;
  for (;;) {
    const page = await mw(`/exercises?limit=100&offset=${offset}`);
    catalog.push(...(page.results ?? []));
    process.stdout.write(`  ${catalog.length}/${page.total}\r`);
    offset += 100;
    if (catalog.length >= (page.total ?? 0) || !page.results?.length) break;
  }
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  console.log(`\ncatalog: ${catalog.length} exercises downloaded`);
}

// ── 2. our exercise names ───────────────────────────────────────
const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

const ours = new Map(); // name -> count
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(path.join(GEN_DIR, f), 'utf8'));
  for (const d of a.drills) {
    for (const ex of d.exercises) ours.set(ex.name, (ours.get(ex.name) ?? 0) + 1);
  }
}

// ── 3. local matching (same rules as the generator) ─────────────
const singular = (w) => {
  if (w.length <= 2) return w; // 'ups' must still singularize to 'up'
  if (/[^aeiou]ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(ch|sh|ss|x|z)es$/.test(w)) return w.slice(0, -2);
  if (/[^s]s$/.test(w)) return w.slice(0, -1);
  return w;
};
const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|with|and|to|for|your|each|per|side|leg|arm)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().split(' ').map(singular).filter(Boolean).join(' ');
const SYN = new Map(Object.entries({
  carry: 'carry', carrie: 'carry', walk: 'carry', march: 'carry',
  hop: 'jump', jump: 'jump', bound: 'jump', skip: 'jump',
  hold: 'hold', plank: 'hold', iso: 'hold', sit: 'hold', rock: 'hold', bridge: 'hold',
  raise: 'raise', lift: 'raise', extension: 'raise',
  curl: 'curl', flexion: 'curl', press: 'press', push: 'press',
  row: 'row', pull: 'pull', pulldown: 'pull', pullup: 'pull', chinup: 'pull',
  crunch: 'crunch', situp: 'crunch', crunche: 'crunch',
  squat: 'squat', lunge: 'lunge', deadlift: 'deadlift', thrust: 'thrust',
  twist: 'rotation', rotation: 'rotation', woodchopper: 'rotation', chop: 'rotation',
  stretch: 'stretch', mobilization: 'stretch',
}));
const head = (k) => { const l = k.split(' ').at(-1) ?? ''; return SYN.get(l) ?? l; };

const index = new Map();
for (const ex of catalog) {
  const k = normalize(ex.name);
  if (k && !index.has(k)) index.set(k, ex);
}

const matched = [];
const unmatched = [];
for (const [name, count] of ours) {
  const key = normalize(name);
  let hit = index.get(key) ?? null;
  if (!hit) {
    const tokens = new Set(key.split(' '));
    let best = null;
    let bestScore = 0;
    for (const [candKey, ex] of index) {
      if (head(candKey) !== head(key)) continue;
      const cand = candKey.split(' ');
      const overlap = cand.filter((t) => tokens.has(t)).length;
      const score = overlap / Math.max(1, Math.min(tokens.size, cand.length));
      if (score > bestScore) { bestScore = score; best = ex; }
    }
    if (bestScore >= 0.5) hit = best;
  }
  (hit ? matched : unmatched).push({ name, count, match: hit?.name ?? null });
}

matched.sort((a, b) => b.count - a.count);
unmatched.sort((a, b) => b.count - a.count);

// ── 4. what the app stores vs what the API offers ───────────────
const sample = await mw('/exercises/8');
const apiFields = Object.keys(sample);
const details = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'exercise-details.json'), 'utf8'));
const storedFields = new Set();
for (const d of Object.values(details)) Object.keys(d).forEach((k) => storedFields.add(k));

const FIELD_MAP = {
  id: 'id (as detailId)', name: 'name', primary_muscles: 'muscles',
  difficulty: 'difficulty', grips: 'grips', steps: 'steps', videos: 'videos/videoUrl',
  category: null, force: null, mechanic: null, bodymap_male: null, bodymap_female: null,
};
const unused = apiFields.filter((f) => FIELD_MAP[f] === null && sample[f] !== null);
const nullOnPlan = apiFields.filter((f) => sample[f] === null);

// ── 5. report ───────────────────────────────────────────────────
const lines = [
  '# MuscleWiki data audit',
  '',
  `Generated against ${catalog.length} MuscleWiki exercises and ${ours.size} distinct exercise names used by DojoFit.`,
  '',
  '## Coverage',
  '',
  `- Matched locally: **${matched.length}/${ours.size}** distinct names (${Math.round((matched.length / ours.size) * 100)}%)`,
  `- No counterpart found: **${unmatched.length}**`,
  '',
  '## Fields the API returns that the app does not store',
  '',
  ...(unused.length ? unused.map((f) => `- \`${f}\` — e.g. ${JSON.stringify(sample[f])}`) : ['- (none)']),
  '',
  '## Fields empty on this plan',
  '',
  ...(nullOnPlan.length ? nullOnPlan.map((f) => `- \`${f}\` (null — not included in the GROWTH tier)`) : ['- (none)']),
  '',
  '## Exercises with no MuscleWiki counterpart',
  '',
  '| Exercise | Used by N drills |',
  '| --- | --- |',
  ...unmatched.slice(0, 60).map((u) => `| ${u.name} | ${u.count} |`),
  '',
  unmatched.length > 60 ? `…and ${unmatched.length - 60} more.` : '',
];
fs.writeFileSync(REPORT, lines.join('\n'));

console.log(`matched ${matched.length}/${ours.size} names locally; ${unmatched.length} unmatched`);
console.log(`unused API fields: ${unused.join(', ') || 'none'}`);
console.log(`null on this plan: ${nullOnPlan.join(', ') || 'none'}`);
console.log(`report written to MUSCLEWIKI-AUDIT.md`);
