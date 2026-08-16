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
src/
  theme.ts                       # color palette
  navigation.ts                  # typed route params
  data/activities.ts             # sports, drills, exercises, stretches, mistakes
  screens/
    HomeScreen.tsx               # sport grid + search
    DrillListScreen.tsx          # drills for the chosen sport
    DrillDetailScreen.tsx        # description, video, gym work, stretches
```

## Adding content

All content lives in `src/data/activities.ts`. Add a new sport or drill by following the existing shape — no other code changes needed. Search on the home screen automatically picks up new entries.

## Roadmap ideas

- Exercise videos/GIFs via the [MuscleWiki API](https://musclewiki.com) (requires an API key)
- Favorites & weekly plan builder
- Progress tracking per drill
