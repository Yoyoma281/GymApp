import React, { useEffect, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Drill, loadSport } from '../data/activities';
import { prefetchSportMedia, primeMediaToken } from '../data/prefetch';
import { sportImages } from '../data/sportImages';
import { t } from '../i18n';
import { tGroup, tSport } from '../i18n/taxonomy';
import { RootStackParamList } from '../navigation';
import { colors, levelColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrillList'>;

export default function DrillListScreen({ navigation, route }: Props) {
  const activity = useMemo(() => loadSport(route.params.activityId), [route.params.activityId]);

  // Warm every clip/poster for this sport while the user browses the list.
  useEffect(() => {
    if (!activity) return;
    primeMediaToken(activity);
    void prefetchSportMedia(activity);
  }, [activity]);

  const groups = useMemo(() => {
    if (!activity) return [];
    const order: string[] = [];
    const byGroup = new Map<string, Drill[]>();
    for (const drill of activity.drills) {
      if (!byGroup.has(drill.group)) {
        byGroup.set(drill.group, []);
        order.push(drill.group);
      }
      byGroup.get(drill.group)!.push(drill);
    }
    return order.map((name) => ({ name, drills: byGroup.get(name)! }));
  }, [activity]);

  if (!activity) return null;

  const hero = sportImages[activity.id];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {hero ? (
        <View style={styles.hero}>
          <Image source={hero} style={styles.heroImage} />
          {/* fades the photo into the page background so it reads as a
              header rather than a banner stuck on top of the list */}
          <LinearGradient
            colors={['rgba(11,11,13,0.2)', 'rgba(11,11,13,0.78)', colors.bg]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.heroText}>
            <Text style={styles.title}>{tSport(activity.name)}</Text>
            <Text style={styles.subtitle}>{t("drillListSubtitle")}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.title}>{activity.name}</Text>
          <Text style={styles.subtitle}>{t("drillListSubtitle")}</Text>
        </View>
      )}
      <View style={styles.body}>
      {groups.map((group) => (
        <View key={group.name}>
          <Text style={styles.groupTitle}>{tGroup(group.name)}</Text>
          <View style={styles.list}>
            {group.drills.map((drill) => (
              <Pressable
                key={drill.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('DrillDetail', {
                    activityId: activity.id,
                    drillId: drill.id,
                  })
                }
              >
                <View style={styles.cardText}>
                  <Text style={styles.drillName}>{drill.name}</Text>
                  <Text style={styles.drillAlt}>{drill.alt}</Text>
                </View>
                <View style={[styles.levelPill, { backgroundColor: levelColors[drill.level].bg }]}>
                  <Text style={[styles.levelText, { color: levelColors[drill.level].fg }]}>
                    {t(`level${drill.level}` as never).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // padding moved onto `body` so the hero photo can run edge to edge
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: 20 },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
    backgroundColor: colors.card,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  heroText: { paddingHorizontal: 20, paddingBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.secondary },
  groupTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  list: { gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardText: { flexShrink: 1 },
  drillName: { fontWeight: '700', fontSize: 16, color: colors.text },
  drillAlt: { fontSize: 13, color: colors.muted, marginTop: 1 },
  levelPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.accent,
  },
});
