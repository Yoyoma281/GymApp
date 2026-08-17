// Translations for the catalogue's own vocabulary: sport names, the
// categories they're grouped under, and the technique groups inside each
// sport. The drill content itself (names, descriptions) stays in its
// source language; these are the labels the app repeats everywhere.
//
// Files are split by language purely so they can be written and reviewed
// independently.

import { getLanguage } from './index';
import { taxonomyA } from './taxonomy.a';
import { taxonomyB } from './taxonomy.b';
import { taxonomyC } from './taxonomy.c';

export interface TaxonomyStrings {
  /** Category name (e.g. "Striking arts") -> translation. */
  categories: Record<string, string>;
  /** Sport name (e.g. "Karate") -> translation. */
  sports: Record<string, string>;
  /** Technique group (e.g. "Kicks") -> translation. */
  groups: Record<string, string>;
}

const TAXONOMY: Record<string, TaxonomyStrings> = {
  ...taxonomyA,
  ...taxonomyB,
  ...taxonomyC,
};

function lookup(kind: keyof TaxonomyStrings, value: string): string {
  const lang = getLanguage();
  if (lang === 'en') return value;
  return TAXONOMY[lang]?.[kind]?.[value] ?? value;
}

export const tCategory = (name: string) => lookup('categories', name);
export const tSport = (name: string) => lookup('sports', name);
export const tGroup = (name: string) => lookup('groups', name);
