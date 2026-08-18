// Emit one review row per distinct exercise name: what it's currently linked
// to, and the best alternatives from the catalogs. A name maps to one detail
// id everywhere it appears, so 755 rows covers all 2,870 exercise slots.
//
// Written for human (or agent) review — the automatic matcher is confident
// and wrong often enough that the only way to trust it is to look.
//
// Usage: node scripts/build-review-packet.mjs [--out DIR] [--chunks 8]
//        ... --skip boxing,karate     already reviewed

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const details = JSON.parse(fs.readFileSync(path.join(GEN_DIR, 'exercise-details.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(here, '.musclewiki-catalog.json'), 'utf8'));
const fedCache = JSON.parse(fs.readFileSync(path.join(here, '.fed-cache.json'), 'utf8'));
const fedList = fedCache.exercises ?? fedCache;

const args = process.argv.slice(2);
const argVal = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = argVal('--out', path.join(here, '..', '.review'));
const CHUNKS = Number(argVal('--chunks', 8));
const skip = new Set((argVal('--skip', '') || '').split(',').filter(Boolean));

const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

function score(query, name) {
  const q = words(query);
  const n = new Set(words(name));
  let hit = 0;
  for (const w of q) {
    if (n.has(w)) hit += 2;
    else if ([...n].some((x) => x.startsWith(w) || w.startsWith(x))) hit += 1;
  }
  return hit / (q.length * 2) - Math.abs(n.size - q.length) * 0.02;
}

const pool = [
  ...catalog.map((e) => ({ id: `mw-${e.id}`, name: e.name })),
  ...fedList.map((e) => ({
    id: `fed-${String(e.name ?? '').replace(/[^A-Za-z0-9]+/g, '_')}`,
    name: e.name ?? '',
  })),
];

// Gather every distinct name with the drills it appears in, for context —
// "Wall sit" in a karate stance drill and in a skiing drill want the same
// entry, but a reviewer needs to see why the name was chosen.
const rows = new Map();
const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f))
  .filter((f) => !skip.has(f.replace('.json', '')));

for (const f of files) {
  const activity = JSON.parse(fs.readFileSync(path.join(GEN_DIR, f), 'utf8'));
  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      if (!rows.has(ex.name)) {
        const current = ex.detailId ? details[ex.detailId] : null;
        rows.set(ex.name, {
          name: ex.name,
          currentId: ex.detailId ?? null,
          currentName: current?.name ?? null,
          currentMuscles: current?.muscles ?? [],
          currentEquipment: current?.equipment ?? null,
          usedIn: [],
          candidates: pool
            .map((c) => ({ ...c, s: score(ex.name, c.name) }))
            .filter((c) => c.s > 0.25)
            .sort((a, b) => b.s - a.s)
            .slice(0, 8)
            .map((c) => ({ id: c.id, name: c.name })),
        });
      }
      const row = rows.get(ex.name);
      if (row.usedIn.length < 3) row.usedIn.push(`${activity.id}/${drill.name}`);
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
const all = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
const per = Math.ceil(all.length / CHUNKS);
for (let i = 0; i < CHUNKS; i++) {
  const slice = all.slice(i * per, (i + 1) * per);
  if (!slice.length) continue;
  fs.writeFileSync(path.join(OUT, `batch-${i + 1}.json`), JSON.stringify(slice, null, 1) + '\n');
  console.log(`batch-${i + 1}.json: ${slice.length} names`);
}
console.log(`\n${all.length} distinct names across ${files.length} sports -> ${OUT}`);
