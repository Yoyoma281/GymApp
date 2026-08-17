export const colors = {
  bg: '#0b0b0d',
  card: '#17171b',
  border: '#26262c',
  accent: '#f08c33',
  accentSoft: '#2b1d0e',
  chipBg: '#1f1f25',
  text: '#f5f5f7',
  body: '#d7d4cf',
  secondary: '#a5a09a',
  muted: '#7c7871',
};

/** Difficulty reads at a glance: green climbs to amber climbs to red. */
export const levelColors: Record<'Beginner' | 'Intermediate' | 'Advanced', Tag> = {
  Beginner: { fg: '#5fd08a', bg: '#12291c' },
  Intermediate: { fg: '#f0b429', bg: '#2c2110' },
  Advanced: { fg: '#ef6b5e', bg: '#2e1513' },
};

/** Non-difficulty pills, kept off the difficulty hues so they don't read as levels. */
export const tagColors = {
  group: { fg: '#6fb3f0', bg: '#12212e' },
  muscles: { fg: '#b78ef0', bg: '#20172e' },
} satisfies Record<string, Tag>;

interface Tag {
  fg: string;
  bg: string;
}
