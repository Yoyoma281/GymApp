import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../theme';

interface Props {
  uri: string;
  poster?: string;
  /** Start muted and looping (ambient drill clips); user can unmute. */
  ambient?: boolean;
}

export default function VideoPlayer({ uri, poster, ambient = false }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = ambient;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(ambient);

  // Reset when the source changes (e.g. a re-resolved token URL)
  useEffect(() => {
    setStarted(false);
  }, [uri]);

  const toggle = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      setStarted(true);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  if (status === 'error') {
    return (
      <View style={[styles.frame, styles.center]}>
        {poster ? <Image source={{ uri: poster }} style={styles.poster} /> : null}
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Video unavailable</Text>
          {error?.message ? <Text style={styles.errorHint}>{error.message}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.frame} onPress={toggle}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Poster covers the frame until playback actually starts */}
      {!started && poster ? <Image source={{ uri: poster }} style={styles.poster} /> : null}

      {status === 'loading' && started ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}

      {!isPlaying ? (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
      ) : null}

      {isPlaying ? (
        <Pressable style={styles.muteButton} onPress={toggleMute} hitSlop={8}>
          <Text style={styles.muteIcon}>{muted ? '🔇' : '🔊'}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  poster: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
  },
  center: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  playIcon: { color: '#fff', fontSize: 24, marginLeft: 5 },
  muteButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: { fontSize: 15 },
  errorOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
  },
  errorText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  errorHint: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
