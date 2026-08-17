// Fallback image fetcher for sports whose keyword search keeps returning
// unrelated files (Commons search for "badminton" famously surfaces the
// Badminton Horse Trials). Pulls from curated Commons categories instead,
// which are hand-maintained and far more reliable.
//
// Usage: node scripts/fetch-missing-images.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'sports');
const META_FILE = path.join(IMG_DIR, 'attributions.json');
const UA = { 'User-Agent': 'DojoFit/1.0 (personal fitness app; sport thumbnails)' };

// Categories chosen to contain action photographs of the sport itself.
const CATEGORIES = {
  kickboxing: ['Category:Kickboxing matches', 'Category:K-1 (kickboxing)', 'Category:Kickboxing'],
  kendo: ['Category:Kendo', 'Category:Kendo practitioners'],
  badminton: ['Category:Badminton at the 2020 Summer Olympics', 'Category:Badminton competitions', 'Category:Badminton players'],
  'olympic-weightlifting': ['Category:Weightlifting at the 2020 Summer Olympics', 'Category:Snatch (weightlifting)', 'Category:Clean and jerk'],
  crossfit: ['Category:CrossFit', 'Category:Functional training', 'Category:Barbell exercises'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithBackoff(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429) return res;
    const wait = 20000 * (attempt + 1);
    console.log(`  429 — backing off ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error('429 after retries');
}

async function fromCategory(category) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    `&generator=categorymembers&gcmtitle=${encodeURIComponent(category)}` +
    // 50 is the cap for imageinfo on a generator; above it, half the
    // pages come back without imageinfo at all.
    '&gcmtype=file&gcmlimit=50' +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1000';
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});
  // Categories mix action photos with logos, maps, portraits and archive
  // scans, so score candidates rather than taking the largest file.
  const REJECT = /logo|map|diagram|poster|coat of arms|flag|stamp|medal|chart|icon|seal|badge|book|cover|ticket|sign|plaque|monument|statue/i;
  const PREFER = /championship|competition|match|tournament|training|practice|athlete|player|bout|fight|open|cup|games|world|final/i;

  const candidates = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    // Commons appends utm_* query params to file URLs, so test the path
    // rather than the whole string.
    const filePath = String(info.url ?? '').split('?')[0];
    if (!/\.(jpe?g|png)$/i.test(filePath)) continue;
    const w = info.width ?? 0;
    const h = info.height ?? 0;
    if (w < 700 || h < 400) continue;      // too small to look sharp
    if (w / h < 1.15) continue;             // want landscape framing
    const title = p.title.replace(/^File:/, '');
    if (REJECT.test(title)) continue;
    const year = Number(title.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? 0);
    if (year && year < 1980) continue;      // skip historical scans
    const meta = info.extmetadata ?? {};
    candidates.push({
      thumbUrl: info.thumburl ?? info.url,
      pageUrl: info.descriptionurl,
      title: p.title,
      author: (meta.Artist?.value ?? 'unknown').replace(/<[^>]+>/g, '').trim(),
      license: meta.LicenseShortName?.value ?? 'see source',
      score: (PREFER.test(title) ? 2 : 0) + Math.min(w / 1000, 2),
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

const attributions = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, 'utf8')) : {};
const extOf = (url) => (/\.png$/i.test(String(url).split('?')[0]) ? 'png' : 'jpg');

for (const [id, categories] of Object.entries(CATEGORIES)) {
  if (['jpg', 'png'].some((e) => fs.existsSync(path.join(IMG_DIR, `${id}.${e}`)))) {
    console.log(`skip ${id} (exists)`);
    continue;
  }
  let hit = null;
  for (const category of categories) {
    await sleep(3000);
    try {
      hit = await fromCategory(category);
    } catch (err) {
      console.warn(`  ${id} via ${category}: ${err.message}`);
    }
    if (hit) break;
  }
  if (!hit) {
    console.warn(`no image found for ${id}`);
    continue;
  }
  const res = await fetchWithBackoff(hit.thumbUrl);
  const file = path.join(IMG_DIR, `${id}.${extOf(hit.thumbUrl)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  attributions[id] = {
    title: hit.title,
    author: hit.author,
    license: hit.license,
    source: hit.pageUrl,
  };
  console.log(`${id}: ${hit.title} (${hit.license})`);
}

fs.writeFileSync(META_FILE, JSON.stringify(attributions, null, 2));
console.log('done — rerun fetch-sport-images.mjs --only none to refresh the map');
