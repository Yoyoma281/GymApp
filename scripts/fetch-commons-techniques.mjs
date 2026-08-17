// Real per-technique demonstration video, for the handful of drills where it
// actually exists.
//
// Every other video source in this app is a compromise: Pexels gives us the
// right sport doing something else, YouTube gives us someone else's player.
// Wikimedia Commons has a small number of genuine single-technique clips,
// filmed deliberately as reference material and openly licensed. The Šabac
// sports-science lab shot a karate set — "Mavashi geri, bocni plan" is
// literally one clip of one roundhouse kick, side plane, twelve seconds.
//
// There are only ~25 of these across all 40 sports, so this is a targeted
// harvest against a hand-written map, not a search. The map is the point:
// each entry was checked to be the same technique, not a similar-sounding
// one (Commons has "Shuto uke", a knife-hand *block* — our "Shuto-uchi" is
// the knife-hand *strike*, so it is deliberately absent below).
//
// The files are webm, which iOS won't play, so they're transcoded to H.264
// mp4 and committed. Commons asks that upload.wikimedia.org not be hotlinked
// anyway, and CC BY-SA permits redistribution as long as attribution rides
// along — which is why clipCredit is set from the API's own artist/license
// fields rather than hardcoded.
//
// Usage: node scripts/fetch-commons-techniques.mjs [--only karate]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const GEN_DIR = path.join(ROOT, 'src', 'data', 'generated');
const OUT_DIR = path.join(ROOT, 'assets', 'techniques');
const META_FILE = path.join(OUT_DIR, 'attributions.json');

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
// Wikimedia's User-Agent policy wants a contact URL, and enforces it: the
// same requests that 429 behind a bare product token succeed with this.
const UA = {
  'User-Agent': 'DojoFit/1.0 (https://github.com/Yoyoma281/GymApp) node-fetch',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Commons throttles hard on back-to-back media downloads and answers 429
// without a Retry-After, so back off and try again rather than dropping the
// clip — a partial harvest leaves some drills on stock footage and some on
// the real technique, which looks arbitrary.
async function get(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.status !== 429) return res;
    const wait = 30000 * (attempt + 1);
    console.log(`  429 — waiting ${wait / 1000}s`);
    await sleep(wait);
  }
  throw new Error('429 after retries');
}

// sport -> drill id -> Commons file title.
// Side-plane ("bocni plan") is preferred over front where both exist: it
// shows the arc of a kick and the extension of a punch, which is what the
// drill is teaching.
const TECHNIQUES = {
  karate: {
    'mae-geri': 'Mae geri keage, bocni plan.webm', // keage = snap kick, matches our drill
    'mawashi-geri': 'Mavashi geri, bocni plan.webm',
    'yoko-geri-kekomi': 'Joko geri kekomi, bocni plan.webm', // Joko = Yoko in their romanisation
    'ushiro-geri': 'Ushiro geri, bocni plan.webm',
    'gyaku-zuki': 'Karate, Djaku zuki, bocni plan.webm', // Djaku = Gyaku
    'oi-zuki': 'Oi zuki, bocni plan.webm',
    'kizami-zuki': 'Kizami zuki, bocni plan.webm',
    'age-uke': 'Karate, Age uke, bocni plan.webm',
    'gedan-barai': 'Karate, Gedan barai, bocni plan.webm',
    'soto-uke': 'Soto uke, bocni plan.webm',
    'heian-shodan': 'Karate, Hean Shodan.webm',
  },
};

const args = process.argv.slice(2);
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? args[onlyArg + 1].split(',') : null;

fs.mkdirSync(OUT_DIR, { recursive: true });
const attributions = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, 'utf8')) : {};

async function commonsInfo(title) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|extmetadata|size|mime' +
    `&titles=${encodeURIComponent(`File:${title}`)}`;
  const res = await get(url);
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const page = Object.values((await res.json()).query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) throw new Error('no imageinfo');
  const meta = info.extmetadata ?? {};
  const strip = (v) => (v ?? '').replace(/<[^>]+>/g, '').trim();
  return {
    // The API decorates the url with utm_* params; the bare file path is what
    // we want to download.
    url: info.url.split('?')[0],
    license: strip(meta.LicenseShortName?.value) || 'see source',
    author: strip(meta.Artist?.value) || 'unknown',
    pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${title}`,
    duration: info.duration ?? null,
  };
}

for (const [sport, drills] of Object.entries(TECHNIQUES)) {
  if (only && !only.includes(sport)) continue;
  const file = path.join(GEN_DIR, `${sport}.json`);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let applied = 0;

  for (const [drillId, title] of Object.entries(drills)) {
    const drill = activity.drills.find((d) => d.id === drillId);
    if (!drill) {
      console.warn(`${sport}/${drillId}: no such drill — map is stale`);
      continue;
    }

    const mp4 = path.join(OUT_DIR, `${sport}-${drillId}.mp4`);
    const poster = path.join(OUT_DIR, `${sport}-${drillId}.jpg`);
    let info;
    try {
      info = await commonsInfo(title);
    } catch (err) {
      console.warn(`${sport}/${drillId}: ${err.message}`);
      continue;
    }


    if (!fs.existsSync(mp4)) {
      let res;
      try {
        res = await get(info.url);
      } catch (err) {
        // Resumable: existing mp4s are skipped, so re-running finishes the rest.
        console.warn(`${sport}/${drillId}: ${err.message} — rerun to continue`);
        continue;
      }
      if (!res.ok) {
        console.warn(`${sport}/${drillId}: download ${res.status}`);
        continue;
      }
      const webm = path.join(OUT_DIR, `.${sport}-${drillId}.webm`);
      fs.writeFileSync(webm, Buffer.from(await res.arrayBuffer()));

      // Baseline H.264 + yuv420p is the combination every iOS and Android
      // decoder accepts; faststart moves the index to the front so playback
      // can begin before the whole file has arrived.
      execFileSync(FFMPEG, [
        '-y', '-loglevel', 'error', '-i', webm,
        '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.0',
        '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart',
        '-an', mp4,
      ]);
      execFileSync(FFMPEG, [
        '-y', '-loglevel', 'error', '-i', mp4, '-frames:v', '1', '-q:v', '4', poster,
      ]);
      fs.unlinkSync(webm);
      await sleep(20000); // stay under Commons' media-download throttle
    }

    const size = (fs.statSync(mp4).size / 1024).toFixed(0);
    // The clip ships inside the app rather than being fetched: it plays
    // offline, costs no bandwidth on repeat views, and can't 404 the way a
    // url pinned to a branch or a CDN can. clipUrl/clipPoster are cleared so
    // nothing tries to fetch a remote copy that doesn't exist.
    delete drill.clipUrl;
    delete drill.clipPoster;
    drill.techniqueClip = `${sport}-${drillId}`;
    drill.clipCredit = `${info.author} / Wikimedia Commons, ${info.license}`;
    attributions[`${sport}-${drillId}`] = { title, ...info };
    applied += 1;
    console.log(`${sport}/${drillId.padEnd(20)} ${title}  (${size}KB, ${info.license})`);
  }

  fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  console.log(`${sport}: ${applied} drills now show the real technique\n`);
}

fs.writeFileSync(META_FILE, JSON.stringify(attributions, null, 2) + '\n');

// Metro needs static require() calls, so the bundled clips are reached
// through a generated map keyed by the same id stored on each drill.
const keys = Object.keys(attributions).sort();
fs.writeFileSync(
  path.join(GEN_DIR, 'techniqueClips.ts'),
  [
    '// AUTO-GENERATED by scripts/fetch-commons-techniques.mjs — do not edit by hand.',
    '//',
    '// Per-technique demonstration clips from Wikimedia Commons, bundled so they',
    '// play offline. See ATTRIBUTIONS.md for the per-clip credit and license.',
    '',
    'export const techniqueClips: Record<string, { video: number; poster: number }> = {',
    ...keys.map(
      (k) =>
        `  '${k}': { video: require('../../../assets/techniques/${k}.mp4'), ` +
        `poster: require('../../../assets/techniques/${k}.jpg') },`,
    ),
    '};',
    '',
  ].join('\n'),
);
console.log(`wrote techniqueClips.ts (${keys.length} clips)`);
