import { Image, Platform } from 'react-native';
import { Activity, exerciseDetails } from './activities';
import { resolveVideoUrl } from './mediaToken';

// Warm media for a whole sport when its drill list opens, so opening a
// drill shows its clip immediately. Posters go through Image.prefetch;
// clips are warmed with a ranged request that pulls the moov atom and
// first frames into the HTTP cache (expo-video's own `useCaching` then
// keeps them on device across sessions).

const warmed = new Set<string>();

async function warmVideo(url: string, bytes = 524287) {
  if (warmed.has(url)) return;
  warmed.add(url);
  try {
    await fetch(url, { headers: { Range: `bytes=0-${bytes}` } });
  } catch {
    warmed.delete(url); // let a later attempt retry
  }
}

export async function prefetchSportMedia(activity: Activity) {
  const posters: string[] = [];
  const videos: string[] = [];

  for (const drill of activity.drills) {
    if (drill.clipPoster) posters.push(drill.clipPoster);
    if (drill.clipUrl) videos.push(drill.clipUrl);
    for (const ex of drill.exercises) {
      if (ex.imageUrl) posters.push(ex.imageUrl);
      const detail = ex.detailId ? exerciseDetails[ex.detailId] : undefined;
      if (detail?.imageUrl) posters.push(detail.imageUrl);
    }
  }

  // The first drill is the one most likely to be opened, so its poster
  // and a bigger slice of its clip go first and in parallel.
  const first = activity.drills[0];
  await Promise.allSettled([
    first?.clipPoster ? Image.prefetch(first.clipPoster) : Promise.resolve(),
    first?.clipUrl ? warmVideo(first.clipUrl, 1_572_863) : Promise.resolve(),
  ]);

  // Then the rest of the posters — small, and they give instant feedback.
  await Promise.allSettled([...new Set(posters)].map((uri) => Image.prefetch(uri)));

  // Then clips, a few at a time so we don't saturate a phone connection.
  const unique = [...new Set(videos)];
  const CONCURRENCY = Platform.OS === 'web' ? 4 : 2;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    await Promise.allSettled(unique.slice(i, i + CONCURRENCY).map(warmVideo));
  }
}

/** Fetch a media token early so exercise videos play without a wait. */
export function primeMediaToken(activity: Activity) {
  for (const drill of activity.drills) {
    for (const ex of drill.exercises) {
      const detail = ex.detailId ? exerciseDetails[ex.detailId] : undefined;
      if (detail?.videoUrl) {
        void resolveVideoUrl(detail.videoUrl);
        return; // one call primes the shared token cache
      }
    }
  }
}
