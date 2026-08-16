// Fetch one openly-licensed photo per sport from Wikimedia Commons
// into assets/sports/<id>.jpg, and write ATTRIBUTIONS.md + the
// src/data/sportImages.ts require map.
//
// Usage: node scripts/fetch-sport-images.mjs [--only id1,id2]
// Existing images are kept; delete a file to refetch it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'sports');
const SPORTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'generated', 'sports.json'), 'utf8'));
const ATTR_FILE = path.join(ROOT, 'ATTRIBUTIONS.md');
const MAP_FILE = path.join(ROOT, 'src', 'data', 'sportImages.ts');
const META_FILE = path.join(IMG_DIR, 'attributions.json');

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',')
  : null;

fs.mkdirSync(IMG_DIR, { recursive: true });

const SEARCH_TERMS = {
  karate: 'karate kumite kick',
  boxing: 'boxing match punch ring',
  'muay-thai': 'muay thai fight kick',
  taekwondo: 'taekwondo kick competition',
  kickboxing: 'kickboxing kick sparring gym',
  mma: 'mixed martial arts fighters octagon',
  'krav-maga': 'krav maga demonstration defense',
  capoeira: 'capoeira roda',
  'kung-fu': 'kung fu shaolin martial',
  bjj: 'brazilian jiu-jitsu grappling',
  judo: 'judo throw competition',
  wrestling: 'freestyle wrestling match',
  aikido: 'aikido demonstration throw dojo',
  fencing: 'fencing competition',
  kendo: 'kendo practice bogu armor',
  archery: 'archer shooting bow arrow target',
  running: 'marathon runners race',
  swimming: 'swimmer butterfly stroke pool lane',
  cycling: 'road cycling race peloton',
  rowing: 'rowing race regatta',
  triathlon: 'ironman triathlon cyclist race',
  powerlifting: 'powerlifting squat barbell competition',
  'olympic-weightlifting': 'weightlifter clean jerk barbell overhead',
  crossfit: 'crossfit games athlete barbell workout',
  gymnastics: 'artistic gymnastics rings',
  yoga: 'yoga class asana mat practice',
  soccer: 'football match player kicks ball',
  basketball: 'basketball game jump',
  tennis: 'tennis serve match',
  volleyball: 'volleyball spike match',
  baseball: 'baseball batter swing',
  rugby: 'rugby tackle match',
  golf: 'golf swing golfer',
  badminton: 'badminton championships match',
  climbing: 'rock climbing bouldering',
  hiking: 'hikers trail mountains backpack',
  surfing: 'surfing wave surfer',
  skiing: 'skier slalom downhill race gate',
  snowboarding: 'snowboarder halfpipe jump snow',
  skateboarding: 'skateboarder ollie ramp skatepark',
};

const UA = { 'User-Agent': 'DojoFit/1.0 (personal fitness app; sport thumbnails)' };

async function fetchWithBackoff(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429) return res;
    const wait = 20000 * (attempt + 1);
    console.log(`  429 — backing off ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error('429 after retries');
}

async function searchCommons(term) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=8' +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${term}`)}` +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=640';
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`commons search ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (!/jpe?g|png/i.test(info.url ?? '')) continue;
    if ((info.width ?? 0) < 640 || (info.height ?? 0) < 400) continue;
    const meta = info.extmetadata ?? {};
    return {
      thumbUrl: info.thumburl ?? info.url,
      pageUrl: info.descriptionurl,
      title: p.title,
      author: (meta.Artist?.value ?? 'unknown').replace(/<[^>]+>/g, '').trim(),
      license: meta.LicenseShortName?.value ?? 'see source',
    };
  }
  return null;
}

const attributions = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const sport of SPORTS) {
  if (only && !only.includes(sport.id)) continue;
  const file = path.join(IMG_DIR, `${sport.id}.jpg`);
  if (fs.existsSync(file)) {
    console.log(`skip ${sport.id} (exists)`);
    continue;
  }
  await sleep(3000); // stay well under Commons rate limits
  try {
    const hit = await searchCommons(SEARCH_TERMS[sport.id] ?? sport.name);
    if (!hit) {
      console.warn(`no image found for ${sport.id}`);
      continue;
    }
    const res = await fetchWithBackoff(hit.thumbUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    attributions[sport.id] = { title: hit.title, author: hit.author, license: hit.license, source: hit.pageUrl };
    console.log(`${sport.id}: ${hit.title} (${hit.license})`);
  } catch (err) {
    console.warn(`${sport.id}: ${err.message}`);
  }
}
fs.writeFileSync(META_FILE, JSON.stringify(attributions, null, 2));

// ATTRIBUTIONS.md
const lines = [
  '# Image attributions',
  '',
  'Sport thumbnails are sourced from Wikimedia Commons under their respective licenses:',
  '',
];
for (const sport of SPORTS) {
  const a = attributions[sport.id];
  if (a) lines.push(`- **${sport.name}** — [${a.title}](${a.source}) by ${a.author}, ${a.license}`);
}
fs.writeFileSync(ATTR_FILE, lines.join('\n') + '\n');

// require map (Metro needs static requires)
const mapLines = [
  '// AUTO-GENERATED by scripts/fetch-sport-images.mjs — do not edit by hand.',
  "import { ImageSourcePropType } from 'react-native';",
  '',
  'export const sportImages: Record<string, ImageSourcePropType> = {',
  ...SPORTS.filter((s) => fs.existsSync(path.join(IMG_DIR, `${s.id}.jpg`))).map(
    (s) => `  '${s.id}': require('../../assets/sports/${s.id}.jpg'),`,
  ),
  '};',
  '',
];
fs.writeFileSync(MAP_FILE, mapLines.join('\n'));
console.log('wrote ATTRIBUTIONS.md and sportImages.ts');
