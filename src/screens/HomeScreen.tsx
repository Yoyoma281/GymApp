import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadSport, searchIndex, sportIndex, SportMeta } from '../data/activities';
import { track } from '../data/analytics';
import { t } from '../i18n';
import { tCategory, tSport } from '../i18n/taxonomy';
import { prefetchSportMedia, primeMediaToken } from '../data/prefetch';
import { sportThumbs } from '../data/sportThumbs';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Memoized so returning to this screen re-attaches the existing cards
// instead of rebuilding 40 photo-backed cells, which stalls the pop
// animation behind a burst of image decoding.
const SportCard = React.memo(function SportCard({
  sport,
  onPress,
}: {
  sport: SportMeta;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.activityCard, pressed && styles.activityCardPressed]}
      onPress={() => onPress(sport.id)}
    >
      {sportThumbs[sport.id] ? (
        <Image source={sportThumbs[sport.id]} style={styles.activityPhoto} />
      ) : (
        <View style={[styles.activityPhoto, styles.activityBadge]}>
          <Text style={styles.activityEmoji}>{sport.emoji}</Text>
        </View>
      )}
      {/* scrim so the label stays readable over any photo */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.activityScrim}
        pointerEvents="none"
      />
      <View style={styles.activityLabel}>
        <Text style={styles.activityName} numberOfLines={2}>
          {tSport(sport.name)}
        </Text>
        <Text style={styles.activityCount}>
          {t("drillsCount").replace("{{count}}", String(sport.drillCount))}
        </Text>
      </View>
    </Pressable>
  );
});

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

  const categories = useMemo(() => {
    const present = new Set(sportIndex.map((s) => s.category));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    for (const c of present) if (!ordered.includes(c)) ordered.push(c);
    return ordered;
  }, []);

  // Search narrows the grid itself instead of swapping in a list of names.
  // A sport survives on its own name, its category, or any drill it contains,
  // so searching a technique still surfaces the sport that teaches it.
  const matchIds = useMemo(() => {
    if (!needle) return null;
    const ids = new Set<string>();
    for (const s of sportIndex) {
      if (s.name.toLowerCase().includes(needle) || s.category.toLowerCase().includes(needle)) {
        ids.add(s.id);
      }
    }
    for (const row of searchIndex) {
      if (ids.has(row.sportId)) continue;
      if (`${row.name} ${row.alt} ${row.muscles}`.toLowerCase().includes(needle)) {
        ids.add(row.sportId);
      }
    }
    return ids;
  }, [needle]);

  // Rows of two, so the list virtualizes by row: 40 sports' worth of bundled
  // photos mounted at once is what made this screen stutter.
  const sections = useMemo(
    () =>
      categories
        .filter((c) => !activeCategory || c === activeCategory)
        .map((category) => {
          const sports = sportIndex.filter(
            (s) => s.category === category && (!matchIds || matchIds.has(s.id)),
          );
          const rows: SportMeta[][] = [];
          for (let i = 0; i < sports.length; i += 2) rows.push(sports.slice(i, i + 2));
          return { title: category, data: rows };
        })
        .filter((section) => section.data.length > 0),
    [categories, activeCategory, matchIds],
  );

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

  const header = (
    <>
      <Text style={styles.kicker}>{t('kicker')}</Text>
      <Text style={styles.title}>{t('homeTitle')}</Text>
      <Text style={styles.subtitle}>{t('homeSubtitle')}</Text>

      <TextInput
        style={styles.search}
        placeholder={t('searchPlaceholder')}
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {/* chips stay put while searching — the grid below is what narrows */}
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
          <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>{t("all")}</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, activeCategory === c && styles.chipActive]}
            onPress={() => setActiveCategory(activeCategory === c ? null : c)}
          >
            <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>
              {tCategory(c)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {needle.length > 0 && sections.length === 0 && (
        <Text style={styles.noResults}>{t("noResults")}</Text>
      )}
    </>
  );

  return (
    <SectionList
      style={styles.root}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(row) => row.map((s) => s.id).join('-')}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{tCategory(section.title)}</Text>
      )}
      renderItem={({ item: row }) => (
        <View style={styles.gridRow}>
          {row.map((sport) => (
            <SportCard key={sport.id} sport={sport} onPress={openSport} />
          ))}
          {/* keeps a lone trailing card at half width instead of stretching */}
          {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
        </View>
      )}
    />
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
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardSpacer: { flex: 1 },
  // flex:1 per card, not flexBasis:'47%' — the percentage failed to resolve
  // against the list row and every sport in a category landed on one line.
  // The photo is absolutely positioned, so it can no longer drive card
  // height the way the old intrinsic-size layout did.
  activityCard: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  activityCardPressed: { opacity: 0.85 },
  // cover, not contain: the photo is the whole card now, so filling the
  // frame matters more than keeping every subject uncropped.
  activityPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  activityBadge: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  activityLabel: { padding: 12, gap: 3 },
  activityEmoji: { fontSize: 34 },
  activityName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: -0.2,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  activityCount: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
});
