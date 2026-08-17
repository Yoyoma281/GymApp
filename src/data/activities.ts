import { loadSport as loadGenerated, sportIndex as generatedIndex } from './generated';
import searchRows from './generated/search-index.json';
import detailsJson from './generated/exercise-details.json';

export interface Exercise {
  name: string;
  scheme: string;
  wgerId?: number;
  imageUrl?: string;
  detailId?: string;
}

export interface ExerciseVideoSource {
  url: string;
  gender?: string | null;
  angle?: string | null;
}

export interface Stretch {
  name: string;
  /** Key into exerciseDetails for a demonstration, when one was matched. */
  detailId?: string;
}

export interface MuscleRef {
  id: number;
  front: boolean;
}

export interface ExerciseDetail {
  name: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videos?: ExerciseVideoSource[];
  muscles?: string[];
  secondaryMuscles?: string[];
  muscleIds?: MuscleRef[];
  secondaryMuscleIds?: MuscleRef[];
  description?: string | null;
  difficulty?: string | null;
  equipment?: string | null;
  /** Push or pull — how the movement loads. */
  force?: string | null;
  /** Compound or isolation. */
  mechanic?: string | null;
  grips?: string[];
  steps?: string[];
  source: 'wger' | 'musclewiki' | 'free-exercise-db';
}

export const exerciseDetails: Record<string, ExerciseDetail> =
  detailsJson as unknown as Record<string, ExerciseDetail>;

export interface Drill {
  id: string;
  group: string;
  name: string;
  alt: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  muscles: string;
  desc: string;
  exercises: Exercise[];
  stretches: Stretch[];
  mistakes: string[];
  videoUrl?: string;
  clipUrl?: string;
  clipPoster?: string;
  clipCredit?: string;
  /**
   * True when the clip demonstrates this exact technique rather than the
   * sport in general — worth saying out loud, since most drills can only be
   * given representative stock footage.
   */
  clipIsTechnique?: boolean;
  /** YouTube video id of a tutorial for this exact technique. */
  tutorialId?: string;
  tutorialTitle?: string;
  tutorialChannel?: string;
}

export interface Activity {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  category: string;
  drills: Drill[];
}

export interface SportMeta {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  category: string;
  drillCount: number;
}

export interface SearchRow {
  sportId: string;
  drillId: string;
  name: string;
  alt: string;
  muscles: string;
}

export const sportIndex: SportMeta[] = generatedIndex;
export const searchIndex: SearchRow[] = searchRows as SearchRow[];

export function loadSport(id: string): Activity | undefined {
  return loadGenerated(id);
}
