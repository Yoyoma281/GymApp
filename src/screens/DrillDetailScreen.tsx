import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  InteractionManager,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { exerciseDetails, loadSport } from '../data/activities';
import { track } from '../data/analytics';
import { t } from '../i18n';
import ExerciseMedia from '../components/ExerciseMedia';
import VideoPlayer from '../components/VideoPlayer';
import TutorialVideo from '../components/TutorialVideo';
import BodyMap from '../components/BodyMap';
import { RootStackParamList } from '../navigation';
import { colors, levelColors, tagColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrillDetail'>;

// The body mounts only while open, so a mount-time fade + short slide reads
// as the panel opening. Height isn't animated: it would need a measure pass,
// and LayoutAnimation is a no-op under the New Architecture.
//
// The contents are held back one interaction tick on purpose. BodyMap parses
// raw SVG strings and ExerciseMedia can spin up a video player, both on the JS
// thread — mounting them in the same frame as the toggle starves the animation
// and the panel appears to jump open after a freeze.
function AccordionBody({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 190,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.exerciseDetail,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        },
      ]}
    >
      {ready ? (
        children
      ) : (
        <View style={styles.exerciseDetailLoading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </Animated.View>
  );
}

export default function DrillDetailScreen({ route }: Props) {
  const activity = useMemo(() => loadSport(route.params.activityId), [route.params.activityId]);
  const drill = activity?.drills.find((d) => d.id === route.params.drillId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedStretch, setExpandedStretch] = useState<string | null>(null);

  useEffect(() => {
    if (activity && drill) track('drill_open', `${activity.id}/${drill.id}`);
  }, [activity, drill]);

  if (!activity || !drill) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* A tutorial for this exact technique is the most useful thing to
          show; the ambient sport clip is the fallback where none was found. */}
      {drill.tutorialId ? (
        <TutorialVideo
          videoId={drill.tutorialId}
          title={drill.tutorialTitle}
          channel={drill.tutorialChannel}
          searchUrl={drill.videoUrl}
        />
      ) : drill.clipUrl ? (
        <View>
          <VideoPlayer uri={drill.clipUrl} poster={drill.clipPoster} ambient />
          <View style={styles.clipFooter}>
            {drill.clipCredit && <Text style={styles.clipCredit}>{drill.clipCredit}</Text>}
            {drill.videoUrl && (
              <Pressable onPress={() => Linking.openURL(drill.videoUrl!)}>
                <Text style={styles.tutorialLink}>{t("findTutorials")} ↗</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.video}
          onPress={() => drill.videoUrl && Linking.openURL(drill.videoUrl)}
        >
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
          <Text style={styles.videoLabel}>
            {drill.videoUrl ? 'watch technique video' : 'technique video'}
          </Text>
        </Pressable>
      )}

      <Text style={styles.title}>{drill.name}</Text>
      <Text style={styles.alt}>{drill.alt}</Text>

      <View style={styles.pills}>
        <View style={[styles.pill, { backgroundColor: levelColors[drill.level].bg }]}>
          <Text style={[styles.pillText, { color: levelColors[drill.level].fg }]}>
            {drill.level.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tagColors.group.bg }]}>
          <Text style={[styles.pillText, { color: tagColors.group.fg }]}>
            {drill.group.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tagColors.muscles.bg }]}>
          <Text style={[styles.pillText, { color: tagColors.muscles.fg }]}>
            {drill.muscles.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.desc}>{drill.desc}</Text>

      <Text style={styles.sectionTitle}>{t("gymWork")}</Text>
      <View style={styles.exerciseList}>
        {drill.exercises.map((e) => {
          const detail = e.detailId ? exerciseDetails[e.detailId] : undefined;
          const isOpen = expanded === e.name;
          return (
            <Pressable
              key={e.name}
              style={styles.exerciseCard}
              onPress={() => {
                if (!detail) return;
                if (!isOpen) track('exercise_open', detail.name);
                setExpanded(isOpen ? null : e.name);
              }}
            >
              <View style={styles.exerciseRow}>
                {e.imageUrl ? (
                  <Image source={{ uri: e.imageUrl }} style={styles.exerciseImage} />
                ) : (
                  <View style={[styles.exerciseImage, styles.exerciseImagePlaceholder]}>
                    <Text style={styles.exerciseImageEmoji}>🏋️</Text>
                  </View>
                )}
                <Text style={styles.exerciseName}>{e.name}</Text>
                <Text style={styles.exerciseScheme}>{e.scheme}</Text>
                {detail && <Text style={styles.exerciseChevron}>{isOpen ? '▾' : '▸'}</Text>}
              </View>
              {isOpen && detail && (
                <AccordionBody>
                  <ExerciseMedia detail={detail} />
                  {detail.muscleIds && detail.muscleIds.length > 0 && (
                    <BodyMap
                      muscles={detail.muscleIds}
                      secondaryMuscles={detail.secondaryMuscleIds}
                    />
                  )}
                  {detail.muscles && detail.muscles.length > 0 && (
                    <Text style={styles.exerciseMeta}>
                      <Text style={styles.exerciseMetaLabel}>{t("muscles")}: </Text>
                      {detail.muscles.join(', ')}
                      {detail.secondaryMuscles?.length
                        ? `  ·  also ${detail.secondaryMuscles.join(', ')}`
                        : ''}
                    </Text>
                  )}
                  {(detail.difficulty || detail.equipment || detail.mechanic) && (
                    <Text style={styles.exerciseMeta}>
                      <Text style={styles.exerciseMetaLabel}>{t('difficulty')}: </Text>
                      {[
                        detail.difficulty,
                        detail.equipment,
                        detail.mechanic,
                        detail.force,
                        detail.grips?.length ? detail.grips.join(', ') : null,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </Text>
                  )}
                  {detail.steps?.length ? (
                    detail.steps.map((s, i) => (
                      <Text key={s} style={styles.exerciseStep}>
                        {i + 1}. {s}
                      </Text>
                    ))
                  ) : detail.description ? (
                    <Text style={styles.exerciseDescription}>{detail.description}</Text>
                  ) : null}
                </AccordionBody>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>{t('stretches')}</Text>
      <View style={styles.stretchList}>
        {drill.stretches.map((s) => {
          const detail = s.detailId ? exerciseDetails[s.detailId] : undefined;
          const isOpen = expandedStretch === s.name;
          return (
            <Pressable
              key={s.name}
              style={[styles.stretchCard, !detail && styles.stretchCardPlain]}
              onPress={() => {
                if (!detail) return;
                if (!isOpen) track('exercise_open', detail.name);
                setExpandedStretch(isOpen ? null : s.name);
              }}
            >
              <View style={styles.stretchRow}>
                <Text style={styles.stretchText}>{s.name}</Text>
                {detail && <Text style={styles.exerciseChevron}>{isOpen ? '▾' : '▸'}</Text>}
              </View>
              {isOpen && detail && (
                <View style={styles.exerciseDetail}>
                  <ExerciseMedia detail={detail} />
                  {detail.steps?.map((step, i) => (
                    <Text key={step} style={styles.exerciseStep}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>{t("watchOutFor")}</Text>
      <View style={styles.mistakeList}>
        {drill.mistakes.map((m) => (
          <View key={m} style={styles.mistakeRow}>
            <View style={styles.bullet} />
            <Text style={styles.mistakeText}>{m}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  video: {
    borderRadius: 16,
    aspectRatio: 16 / 9,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 18, marginLeft: 4 },
  videoLabel: { fontSize: 11, color: colors.muted, fontFamily: 'monospace' as const },
  clipFooter: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clipCredit: { fontSize: 11, color: colors.muted },
  tutorialLink: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
  title: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.5,
    color: colors.text,
  },
  alt: { marginTop: 4, fontSize: 15, color: colors.secondary },
  pills: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  desc: { marginTop: 14, fontSize: 15, lineHeight: 23, color: colors.body },
  sectionTitle: {
    marginTop: 26,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.text,
  },
  exerciseList: { marginTop: 10, gap: 8 },
  exerciseCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseChevron: { fontSize: 13, color: colors.muted },
  exerciseDetail: { marginTop: 12, gap: 8 },
  exerciseDetailLoading: { paddingVertical: 28, alignItems: 'center' },
  exerciseDetailImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    resizeMode: 'contain' as const,
  },
  exerciseMeta: { fontSize: 13, lineHeight: 19, color: colors.body },
  exerciseMetaLabel: { fontWeight: '700', color: colors.text },
  exerciseStep: { fontSize: 13.5, lineHeight: 20, color: colors.body },
  exerciseDescription: { fontSize: 13.5, lineHeight: 20, color: colors.body },
  exerciseImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
  },
  exerciseImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  exerciseImageEmoji: { fontSize: 20 },
  exerciseName: { flex: 1, fontWeight: '600', fontSize: 15, color: colors.text },
  exerciseScheme: { fontSize: 13, fontWeight: '700', color: colors.accent },
  stretchList: { marginTop: 10, gap: 8 },
  stretchCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  stretchCardPlain: { opacity: 0.85 },
  stretchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stretchText: { fontSize: 14, fontWeight: '600', color: colors.body, flex: 1 },
  mistakeList: { marginTop: 10, gap: 8 },
  mistakeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  mistakeText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.body },
});
