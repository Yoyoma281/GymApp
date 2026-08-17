// Hand-curated corrections to the automatic exercise matching.
//
// The fuzzy matcher in generate-content.mjs pairs each drill's exercise name
// with a MuscleWiki / wger / free-exercise-db entry. It gets most of them
// right, but when it is wrong it is wrong loudly: "Neck curls" matched
// "Barbell Curl", "Lateral band walks" matched "Treadmill Walk". A drill that
// says "neck curls" and plays a biceps video is worse than one with no video
// at all, so the corrections below are applied by hand after the fact.
//
// REMAP maps an exercise/stretch name (as written in the drill data) to the
// detail id it should use. `null` means "no honest match exists" — the entry
// is left as plain text rather than pointed at something misleading.
//
// The script also rebuilds every detail entry's body-map muscle ids from that
// entry's own muscle names. They used to be copied from whichever *wger*
// exercise the name matched, which could be a different movement entirely
// from the MuscleWiki video being shown — so the diagram highlighted muscles
// the video didn't train.
//
// Usage: node scripts/remap-exercises.mjs [--only boxing,karate]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN_DIR = path.join(here, '..', 'src', 'data', 'generated');
const DETAILS_FILE = path.join(GEN_DIR, 'exercise-details.json');
const MW_BASE = 'https://api.musclewiki.com';

const key = fs.existsSync(path.join(here, '.musclewiki-key'))
  ? fs.readFileSync(path.join(here, '.musclewiki-key'), 'utf8').trim()
  : process.env.MUSCLEWIKI_API_KEY;

const args = process.argv.slice(2);
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? args[onlyArg + 1].split(',') : null;

// ── the corrections ─────────────────────────────────────────────
//
// Each was checked by reading the drill, the exercise name, and the entry
// the matcher had chosen. Grouped by what went wrong.

const REMAP = {
  // Matched a completely different movement that happened to share a word.
  'Neck curls': 'mw-1346', // was Barbell Curl (biceps!) -> Standing Neck Flexions
  'Wrist roller': 'fed-Wrist_Roller', // was Thoracic Extensions Foam Roller
  'Lateral band walks': 'mw-2210', // was Treadmill Walk -> Mini Band Walking Side To Side
  'Banded lateral walks': 'mw-2210',
  'Barbell push press': 'mw-303', // was Barbell Bench Press -> Barbell Overhead Press
  'Rear-delt cable flyes': 'mw-228', // was Incline Cable Flye (chest) -> Cable High Single Arm Rear Delt Fly
  'Adductor machine': 'mw-1504', // was Ab Crunch Machine -> Machine Hip Adduction
  'Single-leg leg press': 'mw-1671', // was Kettlebell Single Arm Press -> Machine Single Leg Leg Press
  'Side-lying leg raises': 'mw-1485', // was Dumbbell Lying One-Arm Rear Lateral Raise -> Abductor Leg Raise Side Lying
  'Bird dog with band': 'mw-867', // was Deadlift with Bands -> Bird Dog
  'Walking lunges with rotation': 'mw-727', // was Pole Rotation -> Medicine Ball Reverse Lunge Twist
  'Med-ball chest pass': 'fed-Medicine_Ball_Chest_Pass', // was Stability Ball V Up Pass
  'Medicine ball chest throws': 'fed-Medicine_Ball_Chest_Pass', // was Backward Medicine Ball Throw
  'Medicine ball chest throw into sprint': 'fed-Medicine_Ball_Chest_Pass', // was Treadmill Sprint
  'Skater jumps': 'mw-1118', // was Barbell Calf Jump -> Cardio Skater
  'Broad jumps': 'mw-1107', // was Barbell Calf Jump -> Cardio Long Jump
  'Pallof press with lateral step': 'mw-250', // was Step-ups -> Cable Pallof Press
  'Ankle dorsiflexion raises': 'mw-859', // was Side Leg Raises -> Seated Tibialis Raise
  'Agility ladder drills': 'mw-1106', // was Kneeling Arm Drill -> Cardio Lateral Shuffle
  'Cable straight-arm pulldowns': 'fed-Straight_Arm_Pulldown', // was Machine Pulldown
  'Reverse-grip wrist curls': 'mw-1183', // was Cable Bar Reverse Grip Curl -> Barbell Wrist Extension
  'Plate halo circles': 'mw-495', // was Backward Arm Circle -> Plate Halo
  'Kettlebell halos': 'mw-495',

  // Matched the right family but the wrong variation — close enough to look
  // deliberate, wrong enough to teach the wrong thing.
  'Landmine punch press': 'mw-767', // was Landmine Alternating Lunge To Chest Press
  'Landmine press': 'mw-765', // -> Landmine Overhead Press
  'Landmine rotations': 'mw-764', // was Landmine Alternating Lunge And Twist -> Landmine Oblique Twist
  'Landmine rotational press': 'mw-767',
  'Trap-bar deadlifts': 'fed-Trap_Bar_Deadlift', // was Trap Bar Single Leg Deadlift
  'Romanian deadlifts': 'mw-313', // was Single Legged Romanian Deadlifts -> Barbell Romanian Deadlift
  'Cable glute kickbacks': 'mw-1012', // was bodyweight Kickbacks -> Cable Standing Glute Kickback
  'Side planks': 'mw-325', // was Forearm Plank (front plank) -> Elbow Side Plank
  'Side plank with top-leg raise': 'mw-1484', // was Side Leg Raises -> Abductor Leg Raise Side Lying Isometric
  'Copenhagen plank': 'mw-1481', // was Forearm Plank -> Adductor Leg Raise Side Lying Isometric
  'Plyo push-ups': 'fed-Plyo_Push_up', // was plain Push Up
  'Plyometric push-ups': 'fed-Plyo_Push_up',
  'Front squats': 'mw-299', // was Barbell Heels Up Front Squat -> Barbell Front Squat Bodybuilding
  'Bulgarian split squat jumps': 'mw-42', // was Box Jump -> Bulgarian Split Squat
  'Goblet squat with pause': 'mw-11', // was unmatched -> Dumbbell Goblet Squat
  'Lateral med-ball throws': 'mw-720', // was Backward Medicine Ball Throw -> Medicine Ball Partner Side Toss
  'Rotational med-ball throws': 'mw-720',
  'Medicine ball rotational throws': 'mw-720',
  'Medicine ball step-and-throw': 'mw-720',
  'Lateral sled drags': 'fed-Sled_Drag_Harness', // was Bear Crawl Sled Drags
  'Reverse sled drag': 'fed-Sled_Drag_Harness',
  'Cable single-arm pulldowns': 'fed-One_Arm_Lat_Pulldown', // was Band Kneeling Single Arm Pulldown
  'Assault bike intervals': 'mw-1089', // was unmatched -> Cardio Assault Bike
  'Assault bike sprints': 'mw-1089', // was Treadmill Sprint
  'Jump rope basic bounce': 'mw-1597', // was unmatched -> Jump Rope
  'Standing cable hip flexions': 'mw-1483',

  // Genuinely absent from every catalog. Explicitly nulled so a future
  // matching run doesn't quietly reattach something wrong.
  'Battle ropes alternating waves': null,
  'Battle rope intervals': null,
  'Reaction-ball catches': null,
  'Light dumbbell shadowboxing': null,
  'Rear-foot elevated hip flexor march': null,
  'Slow motion kick raises to wall': null,
};

// Stretch names, same idea. The stretch matcher rotated through per-body-part
// variation pools, which kept siblings from repeating but also let a name and
// its video drift apart ("Neck side flexion" -> a mid-back stretch).
const STRETCH_REMAP = {
  'Standing side bend': 'mw-443', // was unmatched -> Dumbbell Overhead Side Bend
  'Neck side flexion': 'mw-1343', // was Traps mid back Stretch -> Standing Neck Rotations
  'Neck rolls': 'mw-649', // was Traps Stretch Variation One -> Half Neck Rolls
  'Arm circles': 'mw-1084', // was unmatched -> Forward Arm Circle
  'Ankle circles': 'mw-1600', // was unmatched -> Ankle Circle
  'Wall ankle dorsiflexion stretch': 'mw-1600',
  'Cossack squat hold': null,
  'Standing side split slide': null,
  'Front split progression': null,
};

// ── MuscleWiki muscle names -> wger body-map muscle ids ──────────
//
// The body map is drawn from wger's per-muscle SVG overlays, so a MuscleWiki
// exercise's muscle names have to be translated into wger's 15 ids. Anything
// wger has no silhouette layer for (forearms, neck, tibialis, lower back)
// maps to nothing and simply isn't highlighted.
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

function toMuscleIds(names) {
  const out = [];
  const seen = new Set();
  for (const name of names ?? []) {
    const id = MUSCLE_IDS[String(name).toLowerCase().trim()];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, front: FRONT.has(id) });
  }
  return out;
}

// ── apply ───────────────────────────────────────────────────────

const details = JSON.parse(fs.readFileSync(DETAILS_FILE, 'utf8'));

async function mwDetail(id) {
  const res = await fetch(`${MW_BASE}/exercises/${id}`, { headers: { 'X-API-Key': key } });
  if (!res.ok) throw new Error(`MuscleWiki ${id}: ${res.status}`);
  const d = await res.json();
  const videos = (d.videos ?? []).map((v) => ({ url: v.url, gender: v.gender, angle: v.angle }));
  const main = videos.find((v) => v.gender === 'male' && v.angle === 'front') ?? videos[0];
  return {
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
}

const fedCache = JSON.parse(fs.readFileSync(path.join(here, '.fed-cache.json'), 'utf8'));
const fedList = fedCache.exercises ?? fedCache;
const fedById = new Map(
  fedList.map((e) => [`fed-${String(e.name ?? '').replace(/[^A-Za-z0-9]+/g, '_')}`, e]),
);

async function ensureDetail(id) {
  if (id === null || details[id]) return;
  if (id.startsWith('mw-')) {
    details[id] = await mwDetail(id.slice(3));
    console.log(`  fetched ${id} — ${details[id].name}`);
  } else if (id.startsWith('fed-')) {
    const e = fedById.get(id);
    if (!e) throw new Error(`${id} not in free-exercise-db cache`);
    details[id] = {
      name: e.name,
      imageUrl: (e.images ?? [])[0]
        ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${e.images[0]}`
        : (e.image ?? null),
      videoUrl: null,
      muscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      difficulty: e.level ?? null,
      equipment: e.equipment ?? null,
      steps: e.instructions ?? [],
      source: 'free-exercise-db',
    };
    console.log(`  added ${id} — ${e.name}`);
  }
}

const files = fs
  .readdirSync(GEN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !['sports.json', 'search-index.json', 'exercise-details.json'].includes(f))
  .filter((f) => !only || only.includes(f.replace('.json', '')));

let changed = 0;
for (const f of files) {
  const file = path.join(GEN_DIR, f);
  const activity = JSON.parse(fs.readFileSync(file, 'utf8'));
  let dirty = false;

  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      if (!(ex.name in REMAP)) continue;
      const want = REMAP[ex.name];
      if (ex.detailId === want || (want === null && !ex.detailId)) continue;
      await ensureDetail(want);
      if (want === null) delete ex.detailId;
      else ex.detailId = want;
      dirty = true;
      changed += 1;
      console.log(`${activity.id}/${drill.id}: "${ex.name}" -> ${want ?? 'text only'}`);
    }
    for (const st of drill.stretches ?? []) {
      if (!(st.name in STRETCH_REMAP)) continue;
      const want = STRETCH_REMAP[st.name];
      if (st.detailId === want || (want === null && !st.detailId)) continue;
      await ensureDetail(want);
      if (want === null) delete st.detailId;
      else st.detailId = want;
      dirty = true;
      changed += 1;
      console.log(`${activity.id}/${drill.id}: stretch "${st.name}" -> ${want ?? 'text only'}`);
    }
  }
  if (dirty) fs.writeFileSync(file, JSON.stringify(activity, null, 2) + '\n');
}

// Rebuild every body map from the entry's own muscles, app-wide — this is the
// fix for diagrams that highlighted a different exercise's muscles.
let remapped = 0;
for (const entry of Object.values(details)) {
  const primary = toMuscleIds(entry.muscles);
  const secondary = toMuscleIds(entry.secondaryMuscles).filter(
    (m) => !primary.some((p) => p.id === m.id),
  );
  if (JSON.stringify(primary) !== JSON.stringify(entry.muscleIds ?? [])) remapped += 1;
  entry.muscleIds = primary;
  entry.secondaryMuscleIds = secondary;
}

fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2) + '\n');
console.log(`\n${changed} exercise/stretch links corrected`);
console.log(`${remapped} body maps rebuilt from the exercise's own muscles`);
