// DojoFit content generator.
//
// Stages:
//   1. Generate the sport list with claude-opus-5   -> src/data/generated/sports.json
//   2. Generate >=15 grouped drills per sport       -> src/data/generated/<sport-id>.json
//   3. Enrich gym exercises with wger.de images     (free API, no key)
//   4. Codegen index.ts (static require map) + search-index.json
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/generate-content.mjs           # everything
//   node scripts/generate-content.mjs --only karate,boxing            # limit stage 2
//   node scripts/generate-content.mjs --codegen-only                  # stages 3+4 only (no key needed)
//   node scripts/generate-content.mjs --skip-enrich                   # skip wger matching
//
// Existing <sport-id>.json files are skipped (resumable); delete a file to regenerate it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const WGER_CACHE = path.join(here, '.wger-cache.json');
const SPORTS_FILE = path.join(GEN_DIR, 'sports.json');

const args = process.argv.slice(2);
const codegenOnly = args.includes('--codegen-only');
const skipEnrich = args.includes('--skip-enrich');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',')
  : null;

fs.mkdirSync(GEN_DIR, { recursive: true });

const CATEGORIES = [
  'Striking arts',
  'Grappling arts',
  'Weapon & traditional arts',
  'Endurance',
  'Strength & fitness',
  'Ball & team sports',
  'Outdoor & adventure',
];

const SPORTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sports'],
  properties: {
    sports: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'emoji', 'tag', 'category'],
        properties: {
          id: { type: 'string', description: 'kebab-case slug, e.g. "muay-thai"' },
          name: { type: 'string' },
          emoji: { type: 'string', description: 'single emoji representing the sport' },
          tag: { type: 'string', description: '2-letter uppercase tag, e.g. "MT"' },
          category: { type: 'string', enum: CATEGORIES },
        },
      },
    },
  },
};

const DRILLS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['drills'],
  properties: {
    drills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'group', 'name', 'alt', 'level', 'muscles', 'desc',
          'exercises', 'stretches', 'mistakes', 'videoQuery',
        ],
        properties: {
          id: { type: 'string', description: 'kebab-case slug unique within the sport' },
          group: { type: 'string', description: 'technique group, e.g. "Kicks", "Punches", "Defense"' },
          name: { type: 'string' },
          alt: { type: 'string', description: 'translation or one-line plain-language name' },
          level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
          muscles: { type: 'string', description: 'primary muscles, " · "-separated, e.g. "Hips · Glutes · Core"' },
          desc: { type: 'string', description: '2-3 sentences: what the movement is and where the power/skill comes from' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'scheme'],
              properties: {
                name: { type: 'string', description: 'common gym exercise name' },
                scheme: { type: 'string', description: 'sets x reps, e.g. "3 × 8 / leg"' },
              },
            },
          },
          stretches: { type: 'array', items: { type: 'string' } },
          mistakes: { type: 'array', items: { type: 'string' } },
          videoQuery: { type: 'string', description: 'YouTube search query for a technique tutorial' },
        },
      },
    },
  },
};

const EXAMPLE_DRILL = {
  id: 'mawashi-geri',
  group: 'Kicks',
  name: 'Mawashi-geri',
  alt: 'Roundhouse kick',
  level: 'Intermediate',
  muscles: 'Hips · Glutes · Core',
  desc: 'A rotational kick striking with the instep or ball of the foot. Power comes from pivoting the support foot and whipping the hip over — not from the leg alone. Chamber high, rotate, snap, retract.',
  exercises: [
    { name: 'Bulgarian split squats', scheme: '3 × 8 / leg' },
    { name: 'Cable hip abductions', scheme: '3 × 12' },
    { name: 'Standing cable woodchoppers', scheme: '3 × 10 / side' },
    { name: 'Copenhagen plank', scheme: '3 × 30s' },
    { name: 'Single-leg calf raises', scheme: '3 × 15' },
  ],
  stretches: ['90/90 hip switch', 'Seated straddle', 'Lying figure-4', 'Standing quad stretch', 'Couch stretch'],
  mistakes: [
    'Support foot doesn’t pivot — kills hip rotation and strains the knee.',
    'Dropping the guard hand on the kicking side.',
    'Striking with the toes instead of instep or ball of foot.',
  ],
  videoQuery: 'mawashi geri karate tutorial',
};

async function makeClient() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic();
}

async function generateJson(client, prompt, schema) {
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error(`Request refused: ${message.stop_details?.explanation ?? 'no explanation'}`);
  }
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

async function generateSportsList(client) {
  if (fs.existsSync(SPORTS_FILE)) {
    console.log('sports.json exists — reusing (delete it to regenerate)');
    return JSON.parse(fs.readFileSync(SPORTS_FILE, 'utf8'));
  }
  console.log('Generating sport list…');
  const result = await generateJson(
    client,
    `You are building the catalog for a gym-workout app for athletes: users pick their sport or ` +
    `activity, then a technique/drill, and the app shows the gym work that builds it.\n\n` +
    `Produce a list of exactly 40 sports/activities. Cover ALL major martial arts (karate, boxing, ` +
    `muay thai, brazilian jiu-jitsu, judo, taekwondo, wrestling, kickboxing, MMA, krav maga, ` +
    `capoeira, aikido, kung fu, fencing, kendo, ...) plus popular sports and activities (running, ` +
    `climbing, swimming, cycling, soccer, basketball, tennis, volleyball, skiing, snowboarding, ` +
    `surfing, golf, hiking, rowing, gymnastics, yoga, ...). Use each category value where it fits ` +
    `best. Keep ids kebab-case and tags 2 uppercase letters, unique across the list.`,
    SPORTS_SCHEMA,
  );
  const sports = result.sports;
  fs.writeFileSync(SPORTS_FILE, JSON.stringify(sports, null, 2) + '\n');
  console.log(`  wrote sports.json (${sports.length} sports)`);
  return sports;
}

async function generateDrills(client, sport) {
  console.log(`Generating drills for ${sport.name}…`);
  const result = await generateJson(
    client,
    `You are writing expert training content for a gym-workout app. For the sport ` +
    `"${sport.name}", produce AT LEAST 15 drills/techniques, organized into 3-6 technique groups ` +
    `via the "group" field (e.g. for karate: "Kicks", "Punches", "Stances & footwork", "Kata & ` +
    `combinations"; for running: "Speed work", "Strength", "Form drills"). Cover the sport's ` +
    `fundamental techniques across all levels, roughly ordered basic-to-advanced within each group.\n\n` +
    `For every drill: a precise 2-3 sentence description of the movement and where its power/skill ` +
    `comes from; 4-5 supporting GYM exercises with set/rep schemes that build exactly the qualities ` +
    `the technique needs (use common gym exercise names a commercial gym supports); 3-5 stretches ` +
    `that unlock the movement; 2-3 common mistakes phrased as one sentence each; and a YouTube ` +
    `search query for a technique tutorial.\n\n` +
    `Match the quality and voice of this example drill exactly:\n` +
    JSON.stringify(EXAMPLE_DRILL, null, 2),
    DRILLS_SCHEMA,
  );
  const drills = result.drills.map((d) => ({
    ...d,
    videoUrl: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(d.videoQuery),
  }));
  for (const d of drills) delete d.videoQuery;
  const activity = { ...sport, drills };
  fs.writeFileSync(path.join(GEN_DIR, `${sport.id}.json`), JSON.stringify(activity, null, 2) + '\n');
  console.log(`  wrote ${sport.id}.json (${drills.length} drills, ${new Set(drills.map((d) => d.group)).size} groups)`);
}

// ── wger enrichment ─────────────────────────────────────────────

const stripHtml = (html) =>
  (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();

async function fetchWgerCatalog() {
  if (fs.existsSync(WGER_CACHE)) {
    return JSON.parse(fs.readFileSync(WGER_CACHE, 'utf8'));
  }
  console.log('Downloading wger exercise catalog…');
  const all = [];
  let url = 'https://wger.de/api/v2/exerciseinfo/?limit=100&format=json';
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wger fetch failed: ${res.status}`);
    const page = await res.json();
    all.push(...page.results);
    url = page.next;
    process.stdout.write(`  ${all.length}/${page.count}\r`);
  }
  console.log(`\n  fetched ${all.length} exercises`);

  // videos live on a separate endpoint, keyed by exercise id
  const videoByExercise = new Map();
  url = 'https://wger.de/api/v2/video/?limit=100&format=json';
  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const page = await res.json();
    for (const v of page.results) {
      if (!videoByExercise.has(v.exercise)) videoByExercise.set(v.exercise, v.video);
    }
    url = page.next;
  }
  console.log(`  fetched ${videoByExercise.size} exercise videos`);

  const slim = all.map((ex) => {
    const en = (ex.translations ?? []).filter((t) => t.language === 2);
    return {
      id: ex.id,
      names: en.flatMap((t) => [t.name, ...(t.aliases ?? []).map((a) => a.alias)]).filter(Boolean),
      image: ex.images?.find((i) => i.is_main)?.image ?? ex.images?.[0]?.image ?? null,
      video: videoByExercise.get(ex.id) ?? null,
      muscles: (ex.muscles ?? []).map((m) => m.name_en || m.name).filter(Boolean),
      secondaryMuscles: (ex.muscles_secondary ?? []).map((m) => m.name_en || m.name).filter(Boolean),
      muscleIds: (ex.muscles ?? []).map((m) => ({ id: m.id, front: !!m.is_front })),
      secondaryMuscleIds: (ex.muscles_secondary ?? []).map((m) => ({ id: m.id, front: !!m.is_front })),
      description: stripHtml(en[0]?.description).slice(0, 500) || null,
    };
  });
  fs.writeFileSync(WGER_CACHE, JSON.stringify(slim));
  return slim;
}

// ── MuscleWiki enrichment (requires MUSCLEWIKI_API_KEY) ─────────
//
// api.musclewiki.com is a paid API: /exercises?search=<name> finds ids,
// /exercises/{id} returns videos (per gender/angle), muscles, difficulty,
// grips and step-by-step instructions. Responses are cached so the call
// quota is only spent once per unique exercise name.

const MW_CACHE = path.join(here, '.musclewiki-cache.json');
const MW_BASE = 'https://api.musclewiki.com';

async function mwGet(pathname, key) {
  const res = await fetch(`${MW_BASE}${pathname}`, { headers: { 'X-API-Key': key } });
  if (res.status === 429) throw new Error('MuscleWiki rate limit hit — re-run later, cache keeps progress');
  if (!res.ok) throw new Error(`MuscleWiki ${pathname}: ${res.status}`);
  return res.json();
}

async function fetchMuscleWikiDetails(uniqueNames, key) {
  const cache = fs.existsSync(MW_CACHE) ? JSON.parse(fs.readFileSync(MW_CACHE, 'utf8')) : {};
  let calls = 0;
  for (const name of uniqueNames) {
    if (name in cache) continue;
    try {
      const search = await mwGet(`/exercises?search=${encodeURIComponent(name)}&limit=1`, key);
      calls += 1;
      const hit = search.results?.[0];
      if (!hit) { cache[name] = null; continue; }
      const detail = await mwGet(`/exercises/${hit.id}`, key);
      calls += 1;
      cache[name] = {
        id: detail.id,
        name: detail.name,
        videos: (detail.videos ?? []).map((v) => ({ url: v.url, gender: v.gender, angle: v.angle })),
        muscles: detail.primary_muscles ?? [],
        difficulty: detail.difficulty ?? null,
        grips: detail.grips ?? [],
        steps: detail.steps ?? [],
      };
    } catch (err) {
      console.warn(`  musclewiki "${name}": ${err.message}`);
      if (/rate limit/.test(err.message)) break;
      cache[name] = null;
    }
    fs.writeFileSync(MW_CACHE, JSON.stringify(cache));
  }
  fs.writeFileSync(MW_CACHE, JSON.stringify(cache));
  console.log(`  musclewiki: ${calls} API calls this run`);
  return cache;
}

const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|a|with|and)\b/g, ' ')
    .replace(/\s+/g, ' ').trim().replace(/s\b/g, '');

function buildWgerIndex(catalog) {
  const index = new Map();
  for (const ex of catalog) {
    for (const name of ex.names) {
      const key = normalize(name);
      if (key && !index.has(key)) index.set(key, ex);
    }
  }
  return index;
}

function tokenMatch(index, name) {
  const key = normalize(name);
  if (index.has(key)) return index.get(key);
  // token-overlap fallback: all tokens of one side contained in the other
  const tokens = new Set(key.split(' '));
  let best = null;
  let bestScore = 0;
  for (const [candKey, ex] of index) {
    const candTokens = candKey.split(' ');
    const overlap = candTokens.filter((t) => tokens.has(t)).length;
    const score = overlap / Math.max(tokens.size, candTokens.length);
    if (score > bestScore) { bestScore = score; best = ex; }
  }
  return bestScore >= 0.75 ? best : null;
}

function enrichSportFile(file, index, mwByName, details) {
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let matched = 0;
  let total = 0;
  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      total += 1;
      delete ex.detailId;
      const mw = mwByName?.[normalize(ex.name)] ?? null;
      const hit = tokenMatch(index, ex.name);
      if (mw) {
        ex.detailId = `mw-${mw.id}`;
        const mainVideo = mw.videos.find((v) => v.gender === 'male' && v.angle === 'front') ?? mw.videos[0];
        details[ex.detailId] = {
          name: mw.name,
          videoUrl: mainVideo?.url ?? null,
          videos: mw.videos,
          muscles: mw.muscles,
          difficulty: mw.difficulty,
          grips: mw.grips,
          steps: mw.steps,
          // body-map layers come from the wger match even when MuscleWiki wins
          muscleIds: hit?.muscleIds ?? [],
          secondaryMuscleIds: hit?.secondaryMuscleIds ?? [],
          source: 'musclewiki',
        };
      }
      if (hit) {
        matched += 1;
        ex.wgerId = hit.id;
        if (hit.image) ex.imageUrl = hit.image;
        if (!mw) {
          ex.detailId = `wger-${hit.id}`;
          details[ex.detailId] = {
            name: hit.names[0] ?? ex.name,
            imageUrl: hit.image,
            videoUrl: hit.video,
            muscles: hit.muscles,
            secondaryMuscles: hit.secondaryMuscles,
            muscleIds: hit.muscleIds,
            secondaryMuscleIds: hit.secondaryMuscleIds,
            description: hit.description,
            source: 'wger',
          };
        }
      }
      if (mw) matched += hit ? 0 : 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
  return { matched, total };
}

// ── codegen ─────────────────────────────────────────────────────

function codegen() {
  const files = fs
    .readdirSync(GEN_DIR)
    .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));
  const sportsMeta = fs.existsSync(SPORTS_FILE) ? JSON.parse(fs.readFileSync(SPORTS_FILE, 'utf8')) : [];
  const metaById = new Map(sportsMeta.map((s) => [s.id, s]));

  const index = [];
  const searchRows = [];
  for (const file of files.sort()) {
    const activity = JSON.parse(fs.readFileSync(path.join(GEN_DIR, file), 'utf8'));
    const meta = metaById.get(activity.id) ?? {};
    index.push({
      id: activity.id,
      name: activity.name,
      emoji: activity.emoji ?? meta.emoji ?? '🏅',
      tag: activity.tag ?? meta.tag ?? '??',
      category: activity.category ?? meta.category ?? 'Strength & fitness',
      drillCount: activity.drills.length,
    });
    for (const d of activity.drills) {
      searchRows.push({ sportId: activity.id, drillId: d.id, name: d.name, alt: d.alt, muscles: d.muscles });
    }
  }

  fs.writeFileSync(path.join(GEN_DIR, 'search-index.json'), JSON.stringify(searchRows, null, 2) + '\n');

  const lines = [
    '// AUTO-GENERATED by scripts/generate-content.mjs — do not edit by hand.',
    "import type { Activity, SportMeta } from '../activities';",
    '',
    `export const sportIndex: SportMeta[] = ${JSON.stringify(index, null, 2)};`,
    '',
    'const loaders: Record<string, () => Activity> = {',
    ...files.sort().map((f) => `  '${path.basename(f, '.json')}': () => require('./${f}') as Activity,`),
    '};',
    '',
    'export function loadSport(id: string): Activity | undefined {',
    '  return loaders[id]?.();',
    '}',
    '',
  ];
  fs.writeFileSync(path.join(GEN_DIR, 'index.ts'), lines.join('\n'));
  console.log(`Codegen: ${index.length} sports, ${searchRows.length} drills indexed`);
}

// ── main ────────────────────────────────────────────────────────

async function main() {
  if (!codegenOnly) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set. Run with --codegen-only for stages 3+4 only.');
      process.exit(1);
    }
    const client = await makeClient();
    const sports = await generateSportsList(client);
    const targets = sports.filter((s) => (only ? only.includes(s.id) : true));
    for (const sport of targets) {
      const file = path.join(GEN_DIR, `${sport.id}.json`);
      if (fs.existsSync(file)) {
        console.log(`skip ${sport.id} (exists)`);
        continue;
      }
      await generateDrills(client, sport);
    }
  }

  if (!skipEnrich) {
    try {
      const catalog = await fetchWgerCatalog();
      const wgerIndex = buildWgerIndex(catalog);
      const files = fs
        .readdirSync(GEN_DIR)
        .filter((f) => f.endsWith('.json') && !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f));

      // Optional MuscleWiki pass — needs the paid API key
      let mwByName = null;
      if (process.env.MUSCLEWIKI_API_KEY) {
        const uniqueNames = new Set();
        for (const f of files) {
          const a = JSON.parse(fs.readFileSync(path.join(GEN_DIR, f), 'utf8'));
          for (const d of a.drills) for (const ex of d.exercises) uniqueNames.add(ex.name);
        }
        console.log(`MuscleWiki enrichment: ${uniqueNames.size} unique exercise names (≤2 API calls each, cached)`);
        const cache = await fetchMuscleWikiDetails([...uniqueNames], process.env.MUSCLEWIKI_API_KEY);
        mwByName = {};
        for (const [name, entry] of Object.entries(cache)) {
          if (entry) mwByName[normalize(name)] = entry;
        }
      } else {
        console.log('MUSCLEWIKI_API_KEY not set — skipping MuscleWiki, using wger only');
      }

      const details = {};
      let matched = 0;
      let total = 0;
      for (const f of files) {
        const r = enrichSportFile(path.join(GEN_DIR, f), wgerIndex, mwByName, details);
        matched += r.matched;
        total += r.total;
      }
      fs.writeFileSync(
        path.join(GEN_DIR, 'exercise-details.json'),
        JSON.stringify(details, null, 2) + '\n',
      );
      const withVideo = Object.values(details).filter((d) => d.videoUrl).length;
      console.log(`enrichment: matched ${matched}/${total} exercises, ${Object.keys(details).length} detail entries (${withVideo} with video)`);
    } catch (err) {
      console.warn(`enrichment skipped: ${err.message}`);
    }
  }

  codegen();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
