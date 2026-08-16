export interface Exercise {
  name: string;
  scheme: string;
}

export interface Stretch {
  name: string;
}

export interface Drill {
  id: string;
  name: string;
  alt: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  muscles: string;
  desc: string;
  exercises: Exercise[];
  stretches: Stretch[];
  mistakes: string[];
  videoUrl?: string;
}

export interface Activity {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  drills: Drill[];
}

export const activities: Activity[] = [
  {
    id: 'karate',
    name: 'Karate',
    tag: 'KA',
    emoji: '🥋',
    drills: [
      {
        id: 'mawashi-geri',
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
        stretches: [
          { name: '90/90 hip switch' },
          { name: 'Seated straddle' },
          { name: 'Lying figure-4' },
          { name: 'Standing quad stretch' },
          { name: 'Couch stretch' },
        ],
        mistakes: [
          'Support foot doesn’t pivot — kills hip rotation and strains the knee.',
          'Dropping the guard hand on the kicking side.',
          'Striking with the toes instead of instep or ball of foot.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=mawashi+geri+tutorial',
      },
      {
        id: 'mae-geri',
        name: 'Mae-geri',
        alt: 'Front snap kick',
        level: 'Beginner',
        muscles: 'Hip flexors · Quads',
        desc: 'A linear snap kick driven by a fast knee lift and extension, striking with the ball of the foot. Speed of the chamber decides the power.',
        exercises: [
          { name: 'Hanging knee raises', scheme: '3 × 12' },
          { name: 'Walking lunges', scheme: '3 × 10 / leg' },
          { name: 'Leg extensions', scheme: '3 × 12' },
          { name: 'Ankle dorsiflexion raises', scheme: '3 × 15' },
        ],
        stretches: [
          { name: 'Kneeling hip flexor stretch' },
          { name: 'Standing hamstring stretch' },
          { name: 'Calf wall stretch' },
        ],
        mistakes: [
          'Leaning back excessively instead of driving hips forward.',
          'Slow retraction — leaves the leg exposed to catches.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=mae+geri+tutorial',
      },
      {
        id: 'gyaku-zuki',
        name: 'Gyaku-zuki',
        alt: 'Reverse punch',
        level: 'Beginner',
        muscles: 'Shoulders · Core · Legs',
        desc: 'The rear-hand straight punch. Force chains from the rear foot through hip rotation into the fist; the arm is the last link, not the engine.',
        exercises: [
          { name: 'Landmine rotational press', scheme: '3 × 8 / side' },
          { name: 'Medicine ball chest throws', scheme: '4 × 6' },
          { name: 'Pallof press', scheme: '3 × 12 / side' },
          { name: 'Push-ups', scheme: '3 × 15' },
        ],
        stretches: [
          { name: 'Doorway pec stretch' },
          { name: 'Thread the needle' },
          { name: 'Wrist flexor stretch' },
        ],
        mistakes: [
          'Punching with the arm only — no hip drive.',
          'Overextending and losing the returning hand (hikite).',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=gyaku+zuki+tutorial',
      },
      {
        id: 'kiba-dachi',
        name: 'Kiba-dachi hold',
        alt: 'Horse stance endurance',
        level: 'Beginner',
        muscles: 'Quads · Glutes · Adductors',
        desc: 'A static wide stance held with thighs near parallel. Builds the leg endurance and rooted posture every karate technique sits on.',
        exercises: [
          { name: 'Goblet squats', scheme: '3 × 12' },
          { name: 'Wall sit', scheme: '3 × 45s' },
          { name: 'Adductor machine', scheme: '3 × 12' },
          { name: 'Tibialis raises', scheme: '3 × 20' },
        ],
        stretches: [
          { name: 'Deep squat hold' },
          { name: 'Butterfly stretch' },
          { name: 'Frog stretch' },
        ],
        mistakes: [
          'Knees caving inward under fatigue.',
          'Leaning the torso forward instead of sitting down.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=kiba+dachi+horse+stance',
      },
    ],
  },
  {
    id: 'boxing',
    name: 'Boxing',
    tag: 'BX',
    emoji: '🥊',
    drills: [
      {
        id: 'cross',
        name: 'Cross',
        alt: 'Rear straight punch',
        level: 'Beginner',
        muscles: 'Shoulders · Core · Calves',
        desc: 'The rear-hand power straight. Push off the rear foot, rotate hip and shoulder together, and land with the knuckles turned over.',
        exercises: [
          { name: 'Landmine punch press', scheme: '3 × 8 / side' },
          { name: 'Rotational med-ball slams', scheme: '4 × 6' },
          { name: 'Cable rows', scheme: '3 × 12' },
          { name: 'Plyo push-ups', scheme: '3 × 8' },
        ],
        stretches: [
          { name: 'Doorway pec stretch' },
          { name: 'Lat stretch on rack' },
          { name: 'Neck side flexion' },
        ],
        mistakes: [
          'Rear heel stays planted — hip can’t rotate through.',
          'Dropping the lead hand while punching.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=boxing+cross+technique',
      },
      {
        id: 'slip-roll',
        name: 'Slip & roll',
        alt: 'Head movement drill',
        level: 'Intermediate',
        muscles: 'Core · Legs · Neck',
        desc: 'Rhythmic defensive movement: slipping outside punches and rolling under hooks. Legs and obliques do the work; eyes stay on the target.',
        exercises: [
          { name: 'Front squats', scheme: '3 × 8' },
          { name: 'Side planks', scheme: '3 × 40s' },
          { name: 'Band rotations', scheme: '3 × 15 / side' },
          { name: 'Neck curls', scheme: '3 × 15' },
        ],
        stretches: [
          { name: 'Standing side bend' },
          { name: 'Cat-cow' },
          { name: 'Deep squat hold' },
        ],
        mistakes: [
          'Bending at the waist instead of the knees.',
          'Taking eyes off the opponent during the roll.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=boxing+slip+and+roll+drill',
      },
      {
        id: 'heavy-bag',
        name: 'Heavy bag rounds',
        alt: 'Conditioning drill',
        level: 'Beginner',
        muscles: 'Full body',
        desc: 'Timed rounds of continuous output on the bag. Builds punch endurance, breathing rhythm and the habit of staying busy while tired.',
        exercises: [
          { name: 'Assault bike intervals', scheme: '8 × 20s' },
          { name: 'Kettlebell swings', scheme: '4 × 15' },
          { name: 'Burpees', scheme: '3 × 12' },
          { name: 'Farmer carries', scheme: '3 × 40m' },
        ],
        stretches: [
          { name: 'Child’s pose' },
          { name: 'Shoulder cross-body stretch' },
          { name: 'Forearm stretch' },
        ],
        mistakes: [
          'Pushing the bag instead of snapping punches.',
          'Holding breath — exhale on every shot.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=heavy+bag+workout+rounds',
      },
    ],
  },
  {
    id: 'muay-thai',
    name: 'Muay Thai',
    tag: 'MT',
    emoji: '🦵',
    drills: [
      {
        id: 'teep',
        name: 'Teep',
        alt: 'Push kick',
        level: 'Beginner',
        muscles: 'Hip flexors · Core',
        desc: 'The long-range push kick used to control distance. Lift the knee high, thrust the hips forward and stab through the target with the ball of the foot.',
        exercises: [
          { name: 'Hanging leg raises', scheme: '3 × 10' },
          { name: 'Step-ups', scheme: '3 × 10 / leg' },
          { name: 'Hip thrusts', scheme: '3 × 10' },
          { name: 'Single-leg RDL', scheme: '3 × 8 / leg' },
        ],
        stretches: [
          { name: 'Kneeling hip flexor stretch' },
          { name: 'Standing hamstring stretch' },
          { name: 'Calf wall stretch' },
        ],
        mistakes: [
          'Pawing with the leg instead of driving the hips.',
          'Telegraphing by leaning back before the lift.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=muay+thai+teep+tutorial',
      },
      {
        id: 'low-kick',
        name: 'Roundhouse (low kick)',
        alt: 'Te kha',
        level: 'Intermediate',
        muscles: 'Glutes · Hips · Shins',
        desc: 'A swinging kick landing with the shin. The whole body turns through the target like swinging a bat — pivot fully and let the arm swing for torque.',
        exercises: [
          { name: 'Barbell hip thrusts', scheme: '3 × 8' },
          { name: 'Cable woodchoppers', scheme: '3 × 10 / side' },
          { name: 'Lateral lunges', scheme: '3 × 10 / leg' },
          { name: 'Tibialis raises', scheme: '3 × 20' },
        ],
        stretches: [
          { name: 'Pigeon pose' },
          { name: '90/90 hip switch' },
          { name: 'Standing quad stretch' },
        ],
        mistakes: [
          'Kicking with the foot instead of the lower shin.',
          'Stopping rotation at contact instead of swinging through.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=muay+thai+low+kick+tutorial',
      },
    ],
  },
  {
    id: 'bjj',
    name: 'BJJ / Grappling',
    tag: 'JJ',
    emoji: '🤼',
    drills: [
      {
        id: 'shrimping',
        name: 'Shrimping',
        alt: 'Hip escape',
        level: 'Beginner',
        muscles: 'Core · Hips',
        desc: 'The fundamental escape movement: bridge, turn to the side and drive the hips away. Every guard retention chain starts here.',
        exercises: [
          { name: 'Glute bridges', scheme: '3 × 12' },
          { name: 'Dead bugs', scheme: '3 × 10 / side' },
          { name: 'Sled pushes', scheme: '4 × 20m' },
          { name: 'V-ups', scheme: '3 × 12' },
        ],
        stretches: [
          { name: 'Happy baby' },
          { name: 'Spinal twist' },
          { name: 'Child’s pose' },
        ],
        mistakes: [
          'Pushing with arms instead of driving off the foot.',
          'Flat hips — no bridge before the escape.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=bjj+shrimping+drill',
      },
      {
        id: 'takedown-entries',
        name: 'Takedown entries',
        alt: 'Level change & penetration step',
        level: 'Intermediate',
        muscles: 'Legs · Back',
        desc: 'Dropping levels and stepping deep between the opponent’s feet. A fast, low, postured entry decides the whole takedown.',
        exercises: [
          { name: 'Trap-bar deadlifts', scheme: '3 × 6' },
          { name: 'Jump squats', scheme: '3 × 8' },
          { name: 'Zercher carries', scheme: '3 × 30m' },
          { name: 'Broad jumps', scheme: '3 × 5' },
        ],
        stretches: [
          { name: 'Couch stretch' },
          { name: 'Deep squat hold' },
          { name: 'Lat stretch on rack' },
        ],
        mistakes: [
          'Bending at the waist instead of the knees on the level change.',
          'Short penetration step — head ends up too far away.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=wrestling+takedown+entries',
      },
    ],
  },
  {
    id: 'running',
    name: 'Running',
    tag: 'RN',
    emoji: '🏃',
    drills: [
      {
        id: 'stride-outs',
        name: 'Stride-outs',
        alt: '80m accelerations',
        level: 'Beginner',
        muscles: 'Hamstrings · Calves',
        desc: 'Relaxed accelerations to ~90% top speed, focusing on tall posture and quick turnover. Teaches fast mechanics without sprint strain.',
        exercises: [
          { name: 'Romanian deadlifts', scheme: '3 × 8' },
          { name: 'Calf raises', scheme: '3 × 15' },
          { name: 'A-skips', scheme: '3 × 20m' },
          { name: 'Hamstring curls', scheme: '3 × 12' },
        ],
        stretches: [
          { name: 'Standing hamstring stretch' },
          { name: 'Calf wall stretch' },
          { name: 'Hip flexor lunge' },
        ],
        mistakes: [
          'Overstriding — foot lands ahead of the hips.',
          'Straining at 100% instead of staying relaxed at 90%.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=running+strides+workout',
      },
      {
        id: 'hill-repeats',
        name: 'Hill repeats',
        alt: 'Strength endurance',
        level: 'Intermediate',
        muscles: 'Glutes · Quads · Calves',
        desc: 'Short uphill efforts with walk-down recovery. Builds leg power and running economy with less impact than flat sprinting.',
        exercises: [
          { name: 'Step-ups', scheme: '3 × 10 / leg' },
          { name: 'Split squats', scheme: '3 × 10 / leg' },
          { name: 'Pogo hops', scheme: '3 × 20' },
          { name: 'Glute bridges', scheme: '3 × 12' },
        ],
        stretches: [
          { name: 'Couch stretch' },
          { name: 'Downward dog' },
          { name: 'Seated forward fold' },
        ],
        mistakes: [
          'Looking down at the feet instead of ahead.',
          'Sprinting the first rep and dying on the rest.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=hill+repeats+running',
      },
    ],
  },
  {
    id: 'climbing',
    name: 'Climbing',
    tag: 'CL',
    emoji: '🧗',
    drills: [
      {
        id: 'hangboard-repeaters',
        name: 'Hangboard repeaters',
        alt: '7:3 protocol',
        level: 'Intermediate',
        muscles: 'Forearms · Fingers',
        desc: 'Seven seconds hanging, three seconds rest, repeated. The standard protocol for finger strength — done fresh, never after a full session.',
        exercises: [
          { name: 'Weighted pull-ups', scheme: '3 × 5' },
          { name: 'Farmer carries', scheme: '3 × 40m' },
          { name: 'Wrist curls', scheme: '3 × 15' },
          { name: 'Scapular pulls', scheme: '3 × 8' },
        ],
        stretches: [
          { name: 'Forearm flexor stretch' },
          { name: 'Finger extensor stretch' },
          { name: 'Lat stretch on rack' },
        ],
        mistakes: [
          'Full crimping on the board — use half crimp or open hand.',
          'Shrugged, disengaged shoulders while hanging.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=hangboard+repeaters+7+3',
      },
      {
        id: 'silent-feet',
        name: 'Silent feet',
        alt: 'Footwork drill',
        level: 'Beginner',
        muscles: 'Calves · Core',
        desc: 'Climb easy routes placing every foot silently and precisely. Forces deliberate hip positioning and weight transfer.',
        exercises: [
          { name: 'Single-leg calf raises', scheme: '3 × 12' },
          { name: 'Pistol squat progressions', scheme: '3 × 5 / leg' },
          { name: 'Plank shoulder taps', scheme: '3 × 20' },
          { name: 'Hip airplanes', scheme: '3 × 6 / side' },
        ],
        stretches: [
          { name: 'Deep squat hold' },
          { name: 'Pigeon pose' },
          { name: 'Ankle circles' },
        ],
        mistakes: [
          'Watching hands instead of feet.',
          'Stabbing at footholds instead of placing them.',
        ],
        videoUrl: 'https://www.youtube.com/results?search_query=silent+feet+climbing+drill',
      },
    ],
  },
];
