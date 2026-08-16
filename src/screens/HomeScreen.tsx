import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadSport, searchIndex, sportIndex, SportMeta } from '../data/activities';
import { track } from '../data/analytics';
import { prefetchSportMedia, primeMediaToken } from '../data/prefetch';
import { sportImages } from '../data/sportImages';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface SearchResult {
  key: string;
  title: string;
  sub: string;
  activityId: string;
  drillId?: string;
}

const CATEGORY_ORDER = [
  'Striking arts',
  'Grappling arts',
  'Weapon & traditional arts',
  'Endurance',
  'Strength & fitness',
  'Ball & team sports',
  'Outdoor & adventure',
];

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();

  const sportById = useMemo(() => {
    const map = new Map<string, SportMeta>();
    for (const s of sportIndex) map.set(s.id, s);
    return map;
  }, []);

  const categories = useMemo(() => {
    const present = new Set(sportIndex.map((s) => s.category));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    for (const c of present) if (!ordered.includes(c)) ordered.push(c);
    return ordered;
  }, []);

  const sections = useMemo(
    () =>
      categories
        .filter((c) => !activeCategory || c === activeCategory)
        .map((category) => ({
          category,
          sports: sportIndex.filter((s) => s.category === category),
        })),
    [categories, activeCategory],
  );

  const results = useMemo<SearchResult[]>(() => {
    if (!needle) return [];
    const out: SearchResult[] = [];
    for (const s of sportIndex) {
      if (s.name.toLowerCase().includes(needle)) {
        out.push({
          key: s.id,
          title: s.name,
          sub: `${s.drillCount} drills · ${s.category}`,
          activityId: s.id,
        });
      }
    }
    for (const row of searchIndex) {
      const hay = `${row.name} ${row.alt} ${row.muscles}`.toLowerCase();
      if (hay.includes(needle)) {
        const sport = sportById.get(row.sportId);
        out.push({
          key: `${row.sportId}-${row.drillId}`,
          title: row.name,
          sub: `${sport?.name ?? row.sportId} · ${row.alt}`,
          activityId: row.sportId,
          drillId: row.drillId,
        });
      }
    }
    return out.slice(0, 10);
  }, [needle, sportById]);

  // Start warming a sport's media on tap, so its first drill already has
  // a poster and buffered clip by the time the drill page opens.
  const openSport = (id: string) => {
    track('sport_open', id);
    const activity = loadSport(id);
    if (activity) {
      primeMediaToken(activity);
      void prefetchSportMedia(activity);
    }
    navigation.navigate('DrillList', { activityId: id });
  };

  const openResult = (r: SearchResult) => {
    track('search', r.drillId ? `${r.activityId}/${r.drillId}` : r.activityId);
    setQuery('');
    if (r.drillId) {
      navigation.navigate('DrillDetail', { activityId: r.activityId, drillId: r.drillId });
    } else {
      navigation.navigate('DrillList', { activityId: r.activityId });
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} stickyHeaderIndices={[]}>
      <Text style={styles.kicker}>TRAIN FOR YOUR SPORT</Text>
      <Text style={styles.title}>What are you working on?</Text>
      <Text style={styles.subtitle}>
        Pick your sport, choose a technique, and get the gym work and stretches that build it.
      </Text>

      <TextInput
        style={styles.search}
        placeholder='Search "kick", "karate", "stretch"…'
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {needle.length > 0 && results.length === 0 && (
        <Text style={styles.noResults}>No matches — try "kick", "karate", "stretch"…</Text>
      )}

      {results.length > 0 && (
        <View style={styles.resultsWrap}>
          {results.map((r) => (
            <Pressable key={r.key} style={styles.resultCard} onPress={() => openResult(r)}>
              <View style={styles.resultText}>
                <Text style={styles.resultTitle}>{r.title}</Text>
                <Text style={styles.resultSub}>{r.sub}</Text>
              </View>
              <Text style={styles.resultArrow}>→</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!needle && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            contentContainerStyle={styles.chipRowContent}
          >
            <Pressable
              style={[styles.chip, !activeCategory && styles.chipActive]}
              onPress={() => setActiveCategory(null)}
            >
              <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>All</Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, activeCategory === c && styles.chipActive]}
                onPress={() => setActiveCategory(activeCategory === c ? null : c)}
              >
                <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {sections.map((section) => (
            <View key={section.category}>
              <Text style={styles.sectionTitle}>{section.category}</Text>
              <View style={styles.grid}>
                {section.sports.map((sport) => (
                  <Pressable
                    key={sport.id}
                    style={styles.activityCard}
                    onPress={() => openSport(sport.id)}
                  >
                    {sportImages[sport.id] ? (
                      <Image source={sportImages[sport.id]} style={styles.activityPhoto} />
                    ) : (
                      <View style={styles.activityBadge}>
                        <Text style={styles.activityEmoji}>{sport.emoji}</Text>
                      </View>
                    )}
                    <Text style={styles.activityName}>{sport.name}</Text>
                    <Text style={styles.activityCount}>{sport.drillCount} drills</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.accent,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    color: colors.text,
  },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.secondary },
  search: {
    marginTop: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  noResults: { marginTop: 14, fontSize: 14, color: colors.muted },
  resultsWrap: { marginTop: 14, gap: 8 },
  resultCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultText: { flexShrink: 1 },
  resultTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  resultSub: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  resultArrow: { color: colors.muted, fontSize: 14 },
  chipRow: { marginTop: 16, marginHorizontal: -20 },
  chipRowContent: { paddingHorizontal: 20, gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  activityBadge: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // contain (not cover) so subjects aren't cropped out of the frame
  activityPhoto: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    resizeMode: 'contain' as const,
    backgroundColor: '#000',
  },
  activityEmoji: { fontSize: 30 },
  activityName: { fontWeight: '700', fontSize: 16.5, color: colors.text },
  activityCount: { fontSize: 13, color: colors.muted, marginTop: -6 },
});
