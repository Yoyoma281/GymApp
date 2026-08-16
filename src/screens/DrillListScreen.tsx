import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activities } from '../data/activities';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrillList'>;

export default function DrillListScreen({ navigation, route }: Props) {
  const activity = activities.find((a) => a.id === route.params.activityId);
  if (!activity) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{activity.name}</Text>
      <Text style={styles.subtitle}>Pick the technique you're drilling this week.</Text>
      <View style={styles.list}>
        {activity.drills.map((drill) => (
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
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>{drill.level.toUpperCase()}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.secondary },
  list: { marginTop: 20, gap: 10 },
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
