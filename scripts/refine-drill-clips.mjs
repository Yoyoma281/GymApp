// Re-pick each drill's Pexels clip using the clip's own description, instead
// of dealing them round-robin out of a per-group pool.
//
// The original fetch searched once per "sport + technique group" and handed
// the results out in order, so a drill got *a* clip from roughly the right
// area and nothing checked what was in it. That produced karate stance drills
// showing taekwondo, a jump-rope drill showing an empty rack of punching bags,
// and a footwork drill showing people stretching.
//
// Every Pexels video has a page slug that describes it ("a-boxer-hitting-a-
// punching-bag"). This script searches per drill, then scores candidates on
// that slug: it must look like the right movement, and must not look like a
// different martial art. Clips that can't clear the bar keep what they have
// rather than being swapped for something equally wrong.
//
// Usage: PEXELS_API_KEY=... node scripts/refine-drill-clips.mjs --only boxing,karate
//        ... --dry     score and report without writing

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const CACHE = path.join(here, '.pexels-slug-cache.json');

const KEY =
  process.env.PEXELS_API_KEY ||
  (fs.existsSync(path.join(here, '.pexels-key'))
    ? fs.readFileSync(path.join(here, '.pexels-key'), 'utf8').trim()
    : '');
if (!KEY) {
  console.error('PEXELS_API_KEY is not set (and scripts/.pexels-key is missing)');
  process.exit(1);
}

const args = process.argv.slice(2);
const argVal = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : dflt;
};
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? args[onlyArg + 1].split(',') : null;
const DRY = args.includes('--dry');

// What each sport's footage should and shouldn't look like, per sport.
//
// The bans matter more than the boosts. Stock libraries tag every martial art
// as "martial arts" and every racket sport as "racket", so a karate search
// happily returns taekwondo and a tennis search returns padel. Showing the
// wrong discipline on a named technique is the most visible way this can be
// wrong, so each sport explicitly names the ones it gets confused with.
const SPORT_RULES = {
  // Striking arts.
  boxing: {
    want: ['boxing', 'boxer', 'punch', 'punching', 'glove', 'ring', 'sparring'],
    ban: [
      'karate', 'taekwondo', 'judo', 'kick', 'kicking', 'kickboxing', 'muay',
      'knee', 'knees', 'wrestling', 'kimono', 'belt',
    ],
  },
  karate: {
    want: ['karate', 'martial', 'kata', 'dojo', 'kimono'],
    ban: [
      'taekwondo', 'boxing', 'boxer', 'judo', 'jujitsu', 'kickboxing', 'kick-boxing',
      'muay', 'glove', 'ring', 'punching-bag',
    ],
  },
  'muay-thai': {
    want: ['muay', 'thai', 'kick', 'knee', 'elbow', 'clinch', 'martial', 'boxing'],
    ban: ['karate', 'taekwondo', 'judo', 'kimono', 'wrestling', 'jiu'],
  },
  taekwondo: {
    want: ['taekwondo', 'kick', 'kicking', 'martial', 'dobok'],
    ban: ['karate', 'boxing', 'boxer', 'judo', 'muay', 'glove', 'wrestling'],
  },
  kickboxing: {
    want: ['kickboxing', 'kick-boxing', 'kick', 'boxing', 'punch', 'glove', 'bag'],
    ban: ['karate', 'taekwondo', 'judo', 'kimono', 'wrestling', 'jiu'],
  },
  mma: {
    want: ['mma', 'mixed', 'cage', 'octagon', 'grappl', 'sparring', 'fighter', 'martial'],
    ban: ['karate', 'taekwondo', 'kimono', 'kata'],
  },
  'krav-maga': {
    want: ['krav', 'self-defense', 'self-defence', 'defense', 'martial', 'combat', 'training'],
    ban: ['karate', 'taekwondo', 'judo', 'kimono', 'kata', 'boxing-ring'],
  },
  capoeira: {
    want: ['capoeira', 'roda', 'martial', 'acrobat'],
    ban: ['karate', 'taekwondo', 'judo', 'boxing', 'kimono', 'punching-bag', 'heavy-bag', 'bag'],
  },
  'kung-fu': {
    want: ['kung', 'fu', 'wushu', 'shaolin', 'martial', 'tai-chi'],
    ban: ['karate', 'taekwondo', 'judo', 'boxing', 'glove'],
  },

  // Grappling. "Martial arts" is far too broad to accept here — a standing
  // striking clip on a guard-retention drill is exactly the failure mode.
  bjj: {
    want: ['jiu', 'jitsu', 'bjj', 'grappl', 'ground', 'submission', 'roll', 'mat'],
    ban: ['karate', 'taekwondo', 'boxing', 'kick', 'punch', 'striking'],
  },
  judo: {
    want: ['judo', 'throw', 'grappl', 'gi', 'kimono', 'mat', 'dojo'],
    ban: ['karate', 'taekwondo', 'boxing', 'kick', 'punch', 'jiu'],
  },
  wrestling: {
    want: ['wrestl', 'grappl', 'takedown', 'mat', 'singlet'],
    ban: ['karate', 'taekwondo', 'boxing', 'kick', 'punch', 'judo', 'arm-wrestl'],
  },
  aikido: {
    want: ['aikido', 'martial', 'dojo', 'throw', 'hakama', 'kimono'],
    ban: ['karate', 'taekwondo', 'boxing', 'kick', 'punch', 'judo', 'jiu'],
  },

  // Weapon and traditional.
  fencing: {
    want: ['fencing', 'fencer', 'sword', 'foil', 'epee', 'sabre', 'saber', 'lunge', 'mask'],
    ban: ['kendo', 'karate', 'boxing', 'wooden'],
  },
  kendo: {
    want: ['kendo', 'shinai', 'bamboo', 'armor', 'armour', 'sword', 'martial', 'dojo'],
    ban: ['fencing', 'foil', 'epee', 'karate', 'boxing'],
  },
  archery: {
    want: ['arch', 'bow', 'arrow', 'target', 'quiver', 'shooting'],
    ban: ['gun', 'rifle', 'pistol', 'crossbow-hunt'],
  },

  // Endurance.
  running: {
    want: ['run', 'runner', 'jog', 'sprint', 'marathon', 'track'],
    ban: ['cycl', 'swim', 'skipping-rope', 'jump-rope', 'jumping-rope'],
  },
  swimming: {
    want: ['swim', 'swimmer', 'pool', 'stroke', 'freestyle', 'water', 'dive', 'lane'],
    ban: ['surf', 'beach-walk'],
  },
  cycling: {
    want: ['cycl', 'bike', 'bicycle', 'rider', 'pedal', 'peloton'],
    ban: ['motorcycle', 'motorbike', 'stationary-empty'],
  },
  rowing: {
    want: ['row', 'rower', 'oar', 'boat', 'scull', 'regatta', 'erg'],
    ban: ['canoe', 'kayak', 'paddleboard'],
  },
  triathlon: {
    want: ['triathlon', 'ironman', 'swim', 'cycl', 'bike', 'run', 'transition'],
    ban: [],
  },

  // Strength and fitness.
  powerlifting: {
    want: ['powerlift', 'squat', 'deadlift', 'bench', 'barbell', 'lifting', 'gym', 'weight'],
    ban: ['snatch', 'clean-and-jerk', 'yoga'],
  },
  'olympic-weightlifting': {
    want: ['weightlift', 'snatch', 'clean', 'jerk', 'barbell', 'lifting', 'platform'],
    ban: ['yoga', 'treadmill'],
  },
  crossfit: {
    want: ['crossfit', 'wod', 'functional', 'gym', 'workout'],
    // 'rope'/'kettlebell'/'burpee' used to live in want; they are movements,
    // not identity, and they pulled a jump-rope clip onto the box-jump drill.
    ban: ['yoga', 'pilates', 'jumping-rope', 'jump-rope'],
  },
  gymnastics: {
    want: ['gymnast', 'rings', 'bars', 'beam', 'vault', 'tumbl', 'somersault', 'handstand'],
    ban: ['yoga', 'dance-class'],
  },
  yoga: {
    want: ['yoga', 'pose', 'asana', 'mat', 'meditat', 'stretch', 'breath'],
    ban: ['pilates-reformer', 'gym', 'barbell'],
  },

  // Ball and team. The ban lists here mostly keep one ball sport out of
  // another's results — "court" and "ball" alone are ambiguous.
  soccer: {
    want: ['soccer', 'football', 'ball', 'pitch', 'goal', 'dribbl', 'kick'],
    ban: ['american-football', 'rugby', 'basketball', 'volleyball', 'handball'],
  },
  basketball: {
    want: ['basketball', 'hoop', 'dribbl', 'court', 'dunk', 'shoot', 'jump-shot'],
    ban: ['volleyball', 'soccer', 'handball', 'netball'],
  },
  tennis: {
    want: ['tennis', 'racket', 'racquet', 'court', 'serve', 'forehand', 'backhand'],
    ban: ['badminton', 'squash', 'table-tennis', 'ping-pong', 'padel'],
  },
  volleyball: {
    want: ['volleyball', 'spike', 'serve', 'net', 'court', 'block', 'dig'],
    ban: ['basketball', 'tennis', 'badminton', 'handball'],
  },
  baseball: {
    want: ['baseball', 'bat', 'pitch', 'glove', 'catcher', 'batter', 'diamond', 'field'],
    ban: ['softball-empty', 'cricket', 'basketball'],
  },
  rugby: {
    want: ['rugby', 'scrum', 'tackle', 'pitch', 'ball', 'try'],
    ban: ['american-football', 'soccer', 'basketball'],
  },
  golf: {
    want: ['golf', 'swing', 'club', 'tee', 'putt', 'fairway', 'green', 'course'],
    ban: ['mini-golf', 'disc-golf'],
  },
  badminton: {
    want: ['badminton', 'shuttlecock', 'shuttle', 'racket', 'racquet', 'net', 'court', 'smash'],
    ban: ['tennis', 'squash', 'table-tennis', 'volleyball'],
  },

  // Outdoor and adventure.
  climbing: {
    want: ['climb', 'boulder', 'crag', 'rock', 'wall', 'rope', 'harness', 'belay'],
    ban: ['stair', 'ladder', 'tree-cut'],
  },
  hiking: {
    want: ['hik', 'trail', 'trek', 'mountain', 'backpack', 'walk', 'summit'],
    ban: ['climb-rope', 'ski'],
  },
  surfing: {
    want: ['surf', 'surfer', 'wave', 'board', 'ocean', 'paddl', 'beach'],
    ban: ['windsurf', 'kitesurf', 'skateboard', 'snowboard', 'wakeboard'],
  },
  skiing: {
    want: ['ski', 'skier', 'slope', 'snow', 'piste', 'alpine', 'mountain'],
    ban: ['snowboard', 'water-ski', 'jet-ski', 'skate'],
  },
  snowboarding: {
    want: ['snowboard', 'board', 'snow', 'slope', 'piste', 'mountain'],
    ban: ['ski', 'skateboard', 'surf', 'wakeboard'],
  },
  skateboarding: {
    want: ['skateboard', 'skater', 'skate', 'ramp', 'skatepark', 'board', 'trick', 'ollie'],
    ban: ['ice-skat', 'roller', 'snowboard', 'surf'],
  },
};

// Movement vocabulary per drill, keyed by substrings of the drill name. A
// clip only needs to look like the right *kind* of movement — stock footage
// will never be labelled "mawashi-geri".
//
// The third element restricts a rule to the sports it makes sense for. This
// is not tidiness: archery's "Hooking & set position" is the finger hook on
// the string, and without the restriction it matched /hook/ and pulled in a
// boxing clip.
const COMBAT = new Set([
  'boxing', 'karate', 'muay-thai', 'taekwondo', 'kickboxing', 'mma', 'krav-maga',
  'capoeira', 'kung-fu', 'bjj', 'judo', 'wrestling', 'aikido',
]);
const ENDURANCE = new Set(['running', 'swimming', 'cycling', 'rowing', 'triathlon']);
const IMPLEMENT = new Set(['baseball', 'golf', 'tennis', 'badminton', 'volleyball']);
const STRIKING = new Set([
  'boxing', 'karate', 'muay-thai', 'taekwondo', 'kickboxing', 'mma', 'krav-maga',
  'capoeira', 'kung-fu',
]);

const MOVEMENT = [
  [/jump rope|skipping/i, ['rope', 'skipping', 'jumping']],
  [/heavy bag|bag work/i, ['bag', 'punching-bag', 'heavybag'], STRIKING],
  [/double-end|reflex/i, ['bag', 'speed', 'reflex'], STRIKING],
  [/shadow/i, ['shadow', 'training', 'practicing'], STRIKING],
  [/stance|footwork|step|pivot|cutting|sabaki/i, ['footwork', 'stance', 'training', 'practicing', 'moving']],
  [/kick|geri/i, ['kick', 'kicking', 'leg'], STRIKING],
  [/punch|jab|cross|hook|uppercut|zuki|uchi/i, ['punch', 'punching', 'strike', 'striking'], STRIKING],
  [/block|uke|barai|guard|parry|slip|roll|defen/i, ['block', 'blocking', 'defense', 'sparring', 'training'], COMBAT],
  [/kata|combination|renzuku/i, ['kata', 'demonstration', 'practicing', 'routine'], COMBAT],
  [/throw|sweep|takedown|pin|choke|submission|escape|guard/i, ['throw', 'grappling', 'takedown', 'ground'], COMBAT],
  [/sprint|interval|tempo|pace/i, ['sprint', 'running', 'fast'], ENDURANCE],
  // "swing" is a bat, club or racket here. Ungated it matched playground
  // swings for baseball and kettlebell swings for CrossFit.
  [/serve|smash|volley|forehand|backhand|swing|shot|putt/i, ['serve', 'swing', 'hitting', 'shot'], IMPLEMENT],
  [/conditioning|rounds/i, ['training', 'workout', 'gym']],
];

// Every sport's identifying words. A clip whose caption names a *different*
// sport is rejected outright, which catches the cross-sport bleed that
// per-sport ban lists kept missing — stock search engines fall back to
// loosely related footage whenever a query is too specific, and the caption
// is the only signal that it happened.
// Triathlon really is running plus cycling plus swimming, so it must not be
// held to the cross-sport rule that keeps those three apart from each other.
const CROSS_SPORT_OK = { triathlon: ['running', 'cycling', 'swimming'] };

const SPORT_TERMS = {
  boxing: ['boxing', 'boxer'],
  karate: ['karate'],
  'muay-thai': ['muay'],
  taekwondo: ['taekwondo'],
  kickboxing: ['kickboxing', 'kick-boxing'],
  mma: ['mma', 'octagon'],
  capoeira: ['capoeira'],
  'kung-fu': ['kung', 'wushu', 'shaolin'],
  bjj: ['jiu', 'jitsu', 'bjj'],
  judo: ['judo'],
  wrestling: ['wrestling', 'wrestler'],
  aikido: ['aikido'],
  fencing: ['fencing', 'fencer'],
  kendo: ['kendo', 'shinai'],
  archery: ['archery', 'archer'],
  running: ['running', 'runner', 'jogging', 'marathon', 'sprinter', 'treadmill'],
  swimming: ['swimming', 'swimmer'],
  cycling: ['cycling', 'cyclist', 'bicycle', 'bike'],
  rowing: ['rowing', 'rower'],
  powerlifting: ['powerlifting'],
  'olympic-weightlifting': ['weightlifting'],
  crossfit: ['crossfit'],
  gymnastics: ['gymnast', 'gymnastics'],
  yoga: ['yoga'],
  soccer: ['soccer', 'football'],
  basketball: ['basketball'],
  tennis: ['tennis'],
  volleyball: ['volleyball'],
  baseball: ['baseball'],
  rugby: ['rugby'],
  golf: ['golf'],
  badminton: ['badminton'],
  climbing: ['climbing', 'bouldering'],
  surfing: ['surfing', 'surfer'],
  skiing: ['skiing', 'skier'],
  snowboarding: ['snowboard'],
  skateboarding: ['skateboard', 'skater'],
};

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


// Pexels allows 200 requests an hour. A full 38-sport run needs ~380 fresh
// queries, so it is paced rather than raced — and a 429 is waited out instead
// of dropped, because a dropped query silently leaves a drill on the clip it
// already had and the run looks like it succeeded.
const DELAY = Number(argVal('--delay', 18000));

async function search(query) {
  if (query in cache) return cache[query];
  const url =
    'https://api.pexels.com/videos/search?orientation=landscape&size=medium&per_page=40' +
    `&query=${encodeURIComponent(query)}`;
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, { headers: { Authorization: KEY } });
    if (res.status !== 429) break;
    if (attempt >= 4) throw new Error('pexels 429 after retries');
    const wait = 10 * 60 * 1000; // the quota window is hourly; short waits don't help
    console.log(`  429 — waiting ${wait / 60000}min`);
    await sleep(wait);
  }
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const data = await res.json();
  cache[query] = (data.videos ?? []).map((v) => ({
    id: v.id,
    slug: (v.url ?? '').replace('https://www.pexels.com/video/', '').replace(/\/$/, ''),
    duration: v.duration,
    credit: v.user?.name ?? '',
    poster: v.image,
    // Prefer a ~720p mp4: small enough to stream on data, sharp enough full-width.
    file: (v.video_files ?? [])
      .filter((f) => f.file_type === 'video/mp4')
      .sort((a, b) => Math.abs((a.height ?? 0) - 720) - Math.abs((b.height ?? 0) - 720))[0]?.link,
  }));
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  await sleep(DELAY);
  return cache[query];
}

function movementWords(drill, sportId) {
  const text = `${drill.name} ${drill.alt ?? ''} ${drill.group ?? ''}`;
  const out = new Set();
  for (const [re, words, restrictTo] of MOVEMENT) {
    if (restrictTo && !restrictTo.has(sportId)) continue;
    if (re.test(text)) words.forEach((w) => out.add(w));
  }
  return [...out];
}

// Clips of people standing around in the right venue. They score well on
// sport words and show none of the technique — the worst kind of near-miss,
// because it looks deliberate.
const STATIC_SLUG =
  /bowing|fixing|tidying|adjusting|breathing|meditat|sitting|portrait|posing|smiling|silhouette|wear|belts?-|uniform|resting|stretching|talking|watching|tired|after-training|preparing-for|removing-shoes|lying-on|playground|park|forest|dance|children-doing-swing|on-swings|drone-shot|drone-view|blur-of/;

// A clip has to have someone in it. Equipment shots ("punching-bag-at-gym",
// "a-video-of-swaying-punching-bags") score just as well as a person hitting
// one on every sport keyword, and demonstrate nothing.
const PERSON_SLUG =
  /man|men|woman|women|boy|girl|person|people|boxer|athlete|student|artist|child|children|kid|trainer|class|fighter|someone|his|her|their/;

function scoreClip(clip, rules, movement, sportId) {
  const slug = clip.slug.toLowerCase();
  if (rules.ban.some((w) => slug.includes(w))) return -Infinity; // wrong art — never
  // Named as some other sport entirely.
  const allowed = CROSS_SPORT_OK[sportId] ?? [];
  for (const [id, terms] of Object.entries(SPORT_TERMS)) {
    if (id === sportId || allowed.includes(id)) continue;
    if (terms.some((t) => slug.includes(t)) && !(SPORT_TERMS[sportId] ?? []).some((t) => slug.includes(t))) {
      return -Infinity;
    }
  }
  if (STATIC_SLUG.test(slug) || !PERSON_SLUG.test(slug)) return -Infinity;
  // "rope" matches battle ropes and boxing-ring ropes as happily as skipping
  // ropes, and none of them look alike.
  if (movement.includes('skipping') && !/jump|skip/.test(slug)) return -Infinity;
  // Every query is sport-scoped, so Pexels returning a clip at all is already
  // evidence of the sport — and the ban list above has removed the arts it
  // confuses karate with. That matters because the captions are unreliable in
  // one direction only: the best karate kick clip in their library is called
  // "a-woman-kicking-the-pads", with no mention of the art.
  let score = 3;
  if (rules.want.some((w) => slug.includes(w))) score += 1;
  if (movement.some((w) => slug.includes(w))) score += 4;
  // A clip long enough to show the movement twice beats a 5-second fragment,
  // but a 40-second one is mostly filler in a card this size.
  if (clip.duration >= 10 && clip.duration <= 30) score += 1;
  if (!clip.file) score -= 10;
  return score;
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f))
  .filter((f) => !only || only.includes(f.replace('.json', '')));

// Claims are tracked across the whole catalog, not per sport. Pexels has only
// a few dozen martial-arts clips and thirteen sports competing for them, so a
// per-sport set let aikido be handed the exact video karate was already
// using. Two sports playing the same clip reads as a bug even when each one
// is individually defensible.
const clipId = (url) => Number((String(url).match(/video-files\/(\d+)\//) ?? [])[1]);

// Who holds each clip, not merely whether it is held. A plain set let a drill
// keep a clip that another drill had just taken, because "it was already
// mine" was true for both of them — the catalog shipped with 18 clips used by
// two drills each, so that case is real rather than theoretical.
const claims = new Map();
for (const f of fs
  .readdirSync(GEN_DIR)
  .filter((x) => x.endsWith('.json'))
  .filter((x) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(x))) {
  const act = JSON.parse(fs.readFileSync(path.join(GEN_DIR, f), 'utf8'));
  for (const d of act.drills) {
    const id = d.clipUrl ? clipId(d.clipUrl) : null;
    if (id !== null && !claims.has(id)) claims.set(id, `${act.id}/${d.id}`);
  }
}

for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rules = SPORT_RULES[activity.id];
  if (!rules) {
    console.log(`${activity.id}: no rules defined — skipped`);
    continue;
  }

  // Score every drill against every candidate first, then hand clips out in
  // descending score order. Assigning in drill order instead let an early
  // mediocre match take a clip that was the only good option for a later
  // drill — and, worse, let a swap steal the clip a kept drill was already
  // using, so two cards played the same video.
  const ranked = [];
  for (const drill of activity.drills) {
    const movement = movementWords(drill, activity.id);
    // Search the movement words too, not just the technique name — no stock
    // library has ever tagged a clip "mawashi-geri", but plenty are tagged
    // "karate kick".
    const queries = [
      ...movement.slice(0, 2).map((w) => `${activity.name} ${w}`),
      `${activity.name} ${drill.group}`,
      `${activity.name} training`,
    ];

    const scored = new Map();
    const weak = new Map(); // below the swap bar, used only to break a duplicate
    for (const q of queries) {
      let candidates;
      try {
        candidates = await search(q);
      } catch (err) {
        console.warn(`  ${drill.id}: ${err.message}`);
        continue;
      }
      for (const c of candidates) {
        const s = scoreClip(c, rules, movement, activity.id);
        // 7 = the sport matched AND the movement matched. Anything less is a
        // clip of the right sport doing something else, which is what the
        // round-robin pool already gave us — not worth a swap.
        if (s >= 7 && !scored.has(c.id)) scored.set(c.id, { clip: c, score: s });
        else if (s >= 4 && !weak.has(c.id)) weak.set(c.id, { clip: c, score: s });
      }
    }
    ranked.push({
      drill,
      options: [...scored.values()].sort((a, b) => b.score - a.score),
      weak: [...weak.values()].sort((a, b) => b.score - a.score),
    });
  }


  let swapped = 0;
  let kept = 0;
  for (const { drill, options, weak } of ranked.slice().sort(
    (a, b) => (b.options[0]?.score ?? 0) - (a.options[0]?.score ?? 0),
  )) {
    const key = `${activity.id}/${drill.id}`;
    const own = drill.clipUrl ? clipId(drill.clipUrl) : null;
    const free = (id) => !claims.has(id) || claims.get(id) === key;
    let pick = options.find((o) => free(o.clip.id));
    // Holding a clip another drill already owns is worse than showing a
    // slightly weaker but unique one, so a duplicate is allowed to drop below
    // the swap bar to escape.
    if (!pick && own !== null && !free(own)) pick = weak.find((o) => free(o.clip.id));
    if (!pick) {
      kept += 1;
      console.log(`  keep   ${drill.id.padEnd(24)} (no better candidate)`);
      continue;
    }
    if (own !== null && own !== pick.clip.id && claims.get(own) === key) claims.delete(own);
    claims.set(pick.clip.id, key);
    swapped += 1;
    console.log(`  swap   ${drill.id.padEnd(24)} score ${pick.score} -> ${pick.clip.slug}`);
    if (!DRY) {
      drill.clipUrl = pick.clip.file;
      drill.clipPoster = pick.clip.poster;
      drill.clipCredit = `${pick.clip.credit} / Pexels`;
    }
  }

  if (!DRY) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  console.log(`${activity.id}: ${swapped} clips re-picked, ${kept} kept\n`);
}
