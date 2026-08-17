import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import attributions from '../../assets/sports/attributions.json';
import { sportIndex } from '../data/activities';
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '../data/analytics';
import { getLanguage, LANGUAGES, setLanguage, t } from '../i18n';
import { tSport } from '../i18n/taxonomy';
import { colors } from '../theme';

interface Attribution {
  title: string;
  author: string;
  license: string;
  source: string;
}

const sourcesFor = () => [
  {
    name: 'wger',
    what: t('exerciseImages'),
    license: 'CC BY-SA 4.0',
    url: 'https://wger.de',
  },
  {
    name: 'free-exercise-db',
    what: t('exerciseInstructions'),
    license: 'Public domain (Unlicense)',
    url: 'https://github.com/yuhonas/free-exercise-db',
  },
  {
    name: 'MuscleWiki',
    what: t('exerciseVideos'),
    license: 'Licensed via MuscleWiki API',
    url: 'https://musclewiki.com',
  },
  {
    name: 'Pexels',
    what: t('sportClips'),
    license: 'Pexels License',
    url: 'https://www.pexels.com',
  },
  {
    name: 'Wikimedia Commons',
    what: t('photographsNote'),
    license: 'Various open licenses',
    url: 'https://commons.wikimedia.org',
  },
];

export default function CreditsScreen() {
  const [optedOut, setOptedOut] = useState(isAnalyticsOptedOut());
  const [lang, setLang] = useState(getLanguage());

  const photos = sportIndex
    .map((s) => ({ sport: s.name, a: (attributions as Record<string, Attribution>)[s.id] }))
    .filter((x) => x.a);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        {t('creditsIntro')}
      </Text>

      <Text style={styles.sectionTitle}>{t('language')}</Text>
      <View style={styles.langWrap}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.langChip, lang === l.code && styles.langChipActive]}
            onPress={() => {
              setLanguage(l.code);
              setLang(l.code);
            }}
          >
            <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>
              {l.native}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('privacy')}</Text>
      <View style={styles.card}>
        <View style={styles.privacyRow}>
          <View style={styles.privacyText}>
            <Text style={styles.cardTitle}>{t('analyticsTitle')}</Text>
            <Text style={styles.cardBody}>{t('analyticsBody')}</Text>
          </View>
          <Switch
            value={!optedOut}
            onValueChange={(on) => {
              setOptedOut(!on);
              void setAnalyticsOptOut(!on);
            }}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('sources')}</Text>
      {sourcesFor().map((s) => (
        <Pressable key={s.name} style={styles.card} onPress={() => Linking.openURL(s.url)}>
          <Text style={styles.cardTitle}>{s.name}</Text>
          <Text style={styles.cardBody}>{s.what}</Text>
          <Text style={styles.cardLicense}>{s.license}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>{t('photographs')}</Text>
      <View style={styles.photoList}>
        {photos.map(({ sport, a }) => (
          <Pressable key={sport} onPress={() => Linking.openURL(a.source)}>
            <Text style={styles.photo}>
              <Text style={styles.photoSport}>{tSport(sport)}</Text> — {a.author || 'unknown'}, {a.license}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.footer}>
        {t('creditsFooter')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 21, color: colors.body },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  langChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  langChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  langText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  langTextActive: { color: '#fff' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardBody: { fontSize: 13, color: colors.body, marginTop: 3 },
  cardLicense: { fontSize: 12, color: colors.accent, marginTop: 5, fontWeight: '600' },
  photoList: { gap: 6 },
  photo: { fontSize: 12.5, lineHeight: 18, color: colors.secondary },
  photoSport: { color: colors.text, fontWeight: '600' },
  footer: { marginTop: 26, fontSize: 12, lineHeight: 18, color: colors.muted },
});
