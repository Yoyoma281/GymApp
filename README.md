# DojoFit 🥋

A React Native (Expo) app that builds your gym program around your sport.

Pick your martial art or activity — Karate, Boxing, Muay Thai, BJJ, Running, Climbing — then pick the technique or drill you're working on (e.g. **mawashi-geri** in Karate). The app shows:

- **Technique description** — what the movement is and where the power comes from
- **Technique video** — link to video references
- **Gym work** — supporting strength exercises with sets & reps (e.g. Bulgarian split squats, cable woodchoppers for a roundhouse kick)
- **Stretches** — the mobility work that unlocks the movement
- **Watch out for** — common mistakes to avoid

## Running the app

```bash
npm install
npx expo start
```

Then scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone, or press `a`/`i` for an Android/iOS emulator, or `w` to run in the browser.

## Structure

```
App.tsx                          # navigation (Home → DrillList → DrillDetail)
scripts/generate-content.mjs     # Claude-powered content generator + wger enrichment
src/
  theme.ts                       # color palette
  navigation.ts                  # typed route params
  data/activities.ts             # types + loader over the generated catalog
  data/generated/                # committed, generated content
    sports.json                  # sport list (id, name, emoji, tag, category)
    <sport-id>.json              # drills for one sport, grouped by technique
    search-index.json            # lightweight rows for global search
    index.ts                     # codegen'd metadata + static require map
  screens/
    HomeScreen.tsx               # category sections + chips + search
    DrillListScreen.tsx          # drills grouped by technique (Kicks, Punches…)
    DrillDetailScreen.tsx        # description, video, gym work (with images), stretches
```

## Content generation

Content is pre-generated with the Claude API (`claude-opus-5`) and committed — the app ships fully offline with no API key.

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run generate            # full run (~40 sports, 15+ drills each)
npm run generate -- --only karate,boxing                 # limit to specific sports
npm run generate -- --codegen-only                       # re-run wger matching + codegen only (no key)
```

The script generates the sport list, then ≥15 drills per sport organized into technique groups (e.g. Karate → Kicks / Punches / Stances), matches each gym exercise against the free [wger.de](https://wger.de) database to attach exercise images, and regenerates the index + search files. Existing `<sport-id>.json` files are skipped, so runs are resumable — delete a file to regenerate that sport.

## Roadmap ideas

- Favorites & weekly plan builder
- Progress tracking per drill
- Embedded technique videos instead of link-outs
