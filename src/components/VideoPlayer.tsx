import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import VideoScrubber from './VideoScrubber';
import { track } from '../data/analytics';
import { t } from '../i18n';
import { colors } from '../theme';

// On web, expo-video renders the <video> at its intrinsic size (e.g.
// 1280x720) inside the sized wrapper, so the frame shows a cropped
// corner instead of the whole shot. Force it to fill its container.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const ID = 'dojofit-video-fit';
  if (!document.getElementById(ID)) {
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = 'video{width:100%!important;height:100%!important;object-fit:contain;}';
    document.head.appendChild(style);
  }
}

interface Props {
  uri: string;
  poster?: string;
  /** Start muted and looping (ambient drill clips); user can unmute. */
  ambient?: boolean;
}

export default function VideoPlayer({ uri, poster, ambient = false }: Props) {
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.loop = true;
    p.muted = ambient;
    p.timeUpdateEventInterval = 0.2;
  });
  const viewRef = useRef<VideoView>(null);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const currentTime = timeUpdate?.currentTime ?? player.currentTime;
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(ambient);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    setStarted(false);
  }, [uri]);

  // The play/pause glyph is transient: it fades out shortly after
  // playback starts and fades back in when paused.
  const overlay = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // Hidden while scrubbing: the drag pauses playback, and the glyph
    // would otherwise pop up over the frames being scrubbed through.
    const hide = isPlaying || scrubbing;
    Animated.timing(overlay, {
      toValue: hide ? 0 : 1,
      duration: scrubbing ? 120 : isPlaying ? 320 : 180,
      delay: isPlaying && !scrubbing ? 260 : 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isPlaying, scrubbing, overlay]);

  // The scrubber fades out with the glyph so playback fills the frame, but
  // on its own value: it has to stay up during a drag, which is exactly when
  // the glyph is hidden.
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const hide = isPlaying && !scrubbing;
    Animated.timing(controlsOpacity, {
      toValue: hide ? 0 : 1,
      duration: hide ? 320 : 180,
      delay: hide ? 260 : 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isPlaying, scrubbing, controlsOpacity]);

  const toggle = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
      if (!started) track('video_play', ambient ? 'drill_clip' : 'exercise_demo');
      setStarted(true);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  const seek = (seconds: number) => {
    player.currentTime = seconds;
    setStarted(true);
  };

  // YouTube-style: playback pauses for the duration of a drag so frames
  // track the thumb, then resumes if it was playing beforehand.
  const resumeAfterScrub = useRef(false);
  const onScrubbingChange = (active: boolean) => {
    setScrubbing(active);
    if (active) {
      resumeAfterScrub.current = player.playing;
      player.pause();
    } else if (resumeAfterScrub.current) {
      player.play();
    }
  };

  if (status === 'error') {
    return (
      <View style={[styles.frame, styles.center]}>
        {poster ? <Image source={{ uri: poster }} style={styles.poster} /> : null}
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{t('videoUnavailable')}</Text>
          {error?.message ? <Text style={styles.errorHint}>{error.message}</Text> : null}
        </View>
      </View>
    );
  }

  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  const showControls = !isPlaying || scrubbing;

  return (
    <View style={styles.frame}>
      <VideoView
        ref={viewRef}
        player={player}
        style={styles.fill}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Keep the poster up until the video can actually render a frame,
          otherwise tapping play shows black while it buffers. */}
      {poster && (!started || status !== 'readyToPlay') ? (
        <Image source={{ uri: poster }} style={styles.poster} />
      ) : null}

      {status === 'loading' && started ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : null}

      {/* The tap target has to sit *above* VideoView rather than wrap it:
          the native video surface consumes touches on Android, so a parent
          Pressable never sees the press. */}
      <Pressable style={styles.fill} onPress={toggle}>
        <Animated.View style={[styles.center, { opacity: overlay }]} pointerEvents="none">
          <View style={styles.playButton}>
            {isPlaying ? (
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <Text style={styles.playIcon}>▶</Text>
            )}
          </View>
        </Animated.View>
      </Pressable>

      {/* Controls: scrubber + mute + fullscreen. Always available while
          paused or scrubbing; a slim scrubber stays visible during play. */}
      <Animated.View
        style={[styles.controls, showControls && styles.controlsSolid, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <VideoScrubber
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          onScrubbingChange={onScrubbingChange}
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.smallButton} onPress={toggleMute} hitSlop={8}>
            <Text style={styles.smallIcon}>{muted ? '🔇' : '🔊'}</Text>
          </Pressable>
          <Pressable
            style={styles.smallButton}
            onPress={() => viewRef.current?.enterFullscreen()}
            hitSlop={8}
          >
            {/* font-independent fullscreen glyph: four corner brackets */}
            <View style={styles.fsIcon}>
              <View style={[styles.fsCorner, styles.fsTL]} />
              <View style={[styles.fsCorner, styles.fsTR]} />
              <View style={[styles.fsCorner, styles.fsBL]} />
              <View style={[styles.fsCorner, styles.fsBR]} />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
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
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'contain' as const,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  pauseIcon: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 6, height: 22, borderRadius: 2, backgroundColor: '#fff' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  controlsSolid: { backgroundColor: 'rgba(0,0,0,0.6)' },
  buttonRow: { flexDirection: 'row', gap: 4, paddingRight: 8 },
  smallButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  smallIcon: { fontSize: 14, color: '#fff' },
  fsIcon: { width: 14, height: 14 },
  fsCorner: { position: 'absolute', width: 5, height: 5, borderColor: '#fff' },
  fsTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  fsTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  fsBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  fsBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
  },
  errorText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  errorHint: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
