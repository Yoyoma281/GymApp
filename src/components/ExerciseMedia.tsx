import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ExerciseDetail } from '../data/activities';
import { isMuscleWikiUrl, resolveVideoUrl } from '../data/mediaToken';
import VideoPlayer from './VideoPlayer';
import { t } from '../i18n';
import { colors } from '../theme';

type State = { kind: 'none' } | { kind: 'loading' } | { kind: 'video'; uri: string } | { kind: 'failed' };

export default function ExerciseMedia({ detail }: { detail: ExerciseDetail }) {
  const [state, setState] = useState<State>({ kind: detail.videoUrl ? 'loading' : 'none' });

  useEffect(() => {
    let alive = true;
    if (!detail.videoUrl) {
      setState({ kind: 'none' });
      return;
    }
    setState({ kind: 'loading' });
    resolveVideoUrl(detail.videoUrl).then((uri) => {
      if (!alive) return;
      setState(uri ? { kind: 'video', uri } : { kind: 'failed' });
    });
    return () => {
      alive = false;
    };
  }, [detail.videoUrl]);

  if (state.kind === 'video') {
    // Only use the still as a poster when it depicts the same thing the video
    // does. A MuscleWiki entry never carries its own image, so its imageUrl is
    // a wger or free-exercise-db *illustration* matched by name — showing that
    // over a real filmed demonstration means the preview is an anatomy diagram
    // and the person only appears once you hit play.
    const poster = detail.source === 'musclewiki' ? undefined : detail.imageUrl ?? undefined;
    return <VideoPlayer uri={state.uri} poster={poster} />;
  }

  const image = detail.imageUrl ? (
    <Image source={{ uri: detail.imageUrl }} style={styles.image} />
  ) : null;

  // A MuscleWiki video exists but no playback token could be fetched —
  // say so rather than silently showing nothing.
  if (state.kind === 'failed' && detail.videoUrl && isMuscleWikiUrl(detail.videoUrl)) {
    return (
      <View>
        {image}
        <Text style={styles.notice}>{t('videoNeedsConnection')}</Text>
      </View>
    );
  }

  return image;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    resizeMode: 'contain' as const,
  },
  notice: { marginTop: 6, fontSize: 11, color: colors.muted },
});
