import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activities } from '../data/activities';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrillDetail'>;

export default function DrillDetailScreen({ route }: Props) {
  const activity = activities.find((a) => a.id === route.params.activityId);
  const drill = activity?.drills.find((d) => d.id === route.params.drillId);
  if (!activity || !drill) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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

      <Text style={styles.title}>{drill.name}</Text>
      <Text style={styles.alt}>{drill.alt}</Text>

      <View style={styles.pills}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Text style={styles.pillAccentText}>{drill.level.toUpperCase()}</Text>
        </View>
        <View style={[styles.pill, styles.pillMuted]}>
          <Text style={styles.pillMutedText}>{drill.muscles.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.desc}>{drill.desc}</Text>

      <Text style={styles.sectionTitle}>Gym work</Text>
      <View style={styles.exerciseList}>
        {drill.exercises.map((e) => (
          <View key={e.name} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{e.name}</Text>
            <Text style={styles.exerciseScheme}>{e.scheme}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Stretches</Text>
      <View style={styles.stretchWrap}>
        {drill.stretches.map((s) => (
          <View key={s.name} style={styles.stretchChip}>
            <Text style={styles.stretchText}>{s.name}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Watch out for</Text>
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
    backgroundColor: '#efe7d8',
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
  pillAccent: { backgroundColor: colors.accentSoft },
  pillAccentText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.accent,
  },
  pillMuted: { backgroundColor: colors.chipBg },
  pillMutedText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.secondary,
  },
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  exerciseName: { fontWeight: '600', fontSize: 15, color: colors.text, flexShrink: 1 },
  exerciseScheme: { fontSize: 13, fontWeight: '700', color: colors.accent },
  stretchWrap: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stretchChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stretchText: { fontSize: 13, fontWeight: '600', color: colors.body },
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
