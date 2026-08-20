// Make each exercise's thumbnail agree with the entry it opens.
//
// The original pipeline set a slot's imageUrl from whichever wger or
// free-exercise-db entry matched the *name*, even when MuscleWiki won the
// detailId — fine at the time, because both came from the same name. The
// review pass then changed 363 names' detailId without touching imageUrl, so
// a card could show one exercise's photo and play another's video (the
// Copenhagen plank drill was showing an unrelated red blob).
//
// Thumbnails are now derived from the detail entry itself: matched by the
// detail's own name, at a deliberately strict threshold, and dropped rather
// than guessed when nothing matches well. The emoji placeholder is honest;
// a confident photo of the wrong exercise is not.
//
// Usage: node scripts/fix-thumbnails.mjs [--dry]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const DETAILS_FILE = path.join(GEN_DIR, 'exercise-details.json');
const DRY = process.argv.includes('--dry');

const details = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));
const wger = JSON.parse(fs.readFileSync(path.join(here, '.wger-cache.json'), 'utf8'));
const fedCache = JSON.parse(fs.readFileSync(path.join(here, '.fed-cache.json'), 'utf8'));
const fedList = fedCache.exercises ?? fedCache;

const singular = (w) => {
  if (w.length <= 2) return w;
  if (/[^aeiou]ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(ch|sh|ss|x|z)es$/.test(w)) return w.slice(0, -2);
  if (/[^s]s$/.test(w)) return w.slice(0, -1);
  return w;
};
const tokens = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);

// Every image the free catalogs can offer, keyed by name.
const images = [];
for (const e of wger) {
  if (e.image) for (const n of e.names ?? []) images.push({ name: n, url: e.image });
}
for (const e of fedList) {
  const img = (e.images ?? [])[0];
  if (img) {
    images.push({
      name: e.name ?? '',
      url: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`,
    });
  }
}

// Strict on purpose: this only fires when the two names really are the same
// exercise. Loose matching is what produced the mismatches in the first place.
function findImage(name) {
  const q = tokens(name);
  if (!q.length) return null;
  let best = null;
  let bestScore = 0;
  for (const cand of images) {
    const c = tokens(cand.name);
    if (!c.length) continue;
    const overlap = c.filter((t) => q.includes(t)).length;
    const score = (2 * overlap) / (q.length + c.length); // Dice coefficient
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return bestScore >= 0.8 ? best.url : null;
}

let resolved = 0;
for (const entry of Object.values(details)) {
  if (entry.imageUrl) continue;
  const url = findImage(entry.name);
  if (url) {
    entry.imageUrl = url;
    resolved += 1;
  }
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

// Only the names whose detailId the review changed can have a stale image.
// Everywhere else the thumbnail and the entry still come from the same name
// match they always did, and dropping those would strip ~1,400 perfectly good
// thumbnails to fix a few hundred wrong ones.
const REVIEW = path.join(here, '..', '.review');
const remapped = new Set();
if (fs.existsSync(REVIEW)) {
  for (const f of fs.readdirSync(REVIEW).filter((x) => /^result-\d+\.json$/.test(x))) {
    for (const row of JSON.parse(fs.readFileSync(path.join(REVIEW, f), 'utf8'))) {
      remapped.add(row.name);
    }
  }
}
console.log(`${remapped.size} names were remapped by the review`);

let aligned = 0;
let dropped = 0;
for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let dirty = false;
  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      const detail = ex.detailId ? details[ex.detailId] : null;
      const want = detail?.imageUrl ?? null;
      if (want && (remapped.has(ex.name) || !ex.imageUrl)) {
        if (ex.imageUrl !== want) {
          ex.imageUrl = want;
          aligned += 1;
          dirty = true;
        }
      } else if (ex.imageUrl && remapped.has(ex.name)) {
        // No detail, or a detail with no image of its own: whatever was here
        // came from a name match we no longer trust.
        delete ex.imageUrl;
        dropped += 1;
        dirty = true;
      }
    }
  }
  if (dirty && !DRY) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
}

if (!DRY) fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2) + '\n');
console.log(`${resolved} detail entries gained an image`);
console.log(`${aligned} slots re-pointed at their entry's image, ${dropped} stale thumbnails dropped`);
