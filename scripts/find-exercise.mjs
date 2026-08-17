// Search the cached MuscleWiki catalog (and free-exercise-db) by keyword, so a
// human can eyeball the real candidates for an exercise name instead of
// trusting the automatic fuzzy match.
//
// Usage: node scripts/find-exercise.mjs "lateral band walk" "neck curl" ...
//        ... --limit 12

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(here, '.musclewiki-catalog.json'), 'utf8'));
const fed = JSON.parse(fs.readFileSync(path.join(here, '.fed-cache.json'), 'utf8'));

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : 10;
const queries = args.filter((a, i) => a !== '--limit' && args[i - 1] !== '--limit');

const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

// Score by how many query words appear in the name, weighting rarer words
// higher — "walk" alone matches 40 entries, "band walk" should beat them.
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

for (const query of queries) {
  const ranked = [
    ...catalog.map((e) => ({ id: `mw-${e.id}`, name: e.name, s: score(query, e.name) })),
    ...(fed.exercises ?? fed ?? []).map((e) => ({
      id: `fed-${(e.name ?? '').replace(/[^A-Za-z0-9]+/g, '_')}`,
      name: e.name ?? '',
      s: score(query, e.name ?? ''),
    })),
  ]
    .filter((e) => e.s > 0.2)
    .sort((a, b) => b.s - a.s)
    .slice(0, LIMIT);

  console.log(`\n### ${query}`);
  for (const r of ranked) console.log(`  ${r.s.toFixed(2)}  ${r.id.padEnd(28)} ${r.name}`);
  if (!ranked.length) console.log('  (no candidates)');
}
