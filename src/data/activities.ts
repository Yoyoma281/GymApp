import { loadSport as loadGenerated, sportIndex as generatedIndex } from './generated';
import searchRows from './generated/search-index.json';

export interface Exercise {
  name: string;
  scheme: string;
  wgerId?: number;
  imageUrl?: string;
}

export interface Drill {
  id: string;
  group: string;
  name: string;
  alt: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  muscles: string;
  desc: string;
  exercises: Exercise[];
  stretches: string[];
  mistakes: string[];
  videoUrl?: string;
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
