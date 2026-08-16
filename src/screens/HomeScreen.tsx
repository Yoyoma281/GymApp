import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activities } from '../data/activities';
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

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const results = useMemo<SearchResult[]>(() => {
    if (!needle) return [];
    const out: SearchResult[] = [];
    for (const a of activities) {
      if (a.name.toLowerCase().includes(needle)) {
        out.push({
          key: a.id,
          title: a.name,
          sub: `${a.drills.length} drills`,
          activityId: a.id,
        });
      }
      for (const d of a.drills) {
        const hay = `${d.name} ${d.alt} ${d.muscles}`.toLowerCase();
        if (hay.includes(needle)) {
          out.push({
            key: `${a.id}-${d.id}`,
            title: d.name,
            sub: `${a.name} · ${d.alt}`,
            activityId: a.id,
            drillId: d.id,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [needle]);

  const openResult = (r: SearchResult) => {
    setQuery('');
    if (r.drillId) {
      navigation.navigate('DrillDetail', { activityId: r.activityId, drillId: r.drillId });
    } else {
      navigation.navigate('DrillList', { activityId: r.activityId });
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
        <FlatList
          scrollEnabled={false}
          data={activities}
          keyExtractor={(a) => a.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.activityCard}
              onPress={() => navigation.navigate('DrillList', { activityId: item.id })}
            >
              <View style={styles.activityBadge}>
                <Text style={styles.activityEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.activityName}>{item.name}</Text>
              <Text style={styles.activityCount}>{item.drills.length} drills</Text>
            </Pressable>
          )}
        />
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
  grid: { marginTop: 20 },
  gridRow: { gap: 12 },
  activityCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  activityBadge: {
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: { fontSize: 30 },
  activityName: { fontWeight: '700', fontSize: 16.5, color: colors.text },
  activityCount: { fontSize: 13, color: colors.muted, marginTop: -6 },
});
