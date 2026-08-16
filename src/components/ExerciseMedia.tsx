import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { ExerciseDetail } from '../data/activities';
import { resolveVideoUrl } from '../data/mediaToken';
import ExerciseVideo from './ExerciseVideo';
import { colors } from '../theme';

export default function ExerciseMedia({ detail }: { detail: ExerciseDetail }) {
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setVideoUri(null);
    if (detail.videoUrl) {
      resolveVideoUrl(detail.videoUrl).then((uri) => {
        if (alive) setVideoUri(uri);
      });
    }
    return () => {
      alive = false;
    };
  }, [detail.videoUrl]);

  if (videoUri) return <ExerciseVideo uri={videoUri} />;
  if (detail.imageUrl) return <Image source={{ uri: detail.imageUrl }} style={styles.image} />;
  return null;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    resizeMode: 'contain' as const,
  },
});
