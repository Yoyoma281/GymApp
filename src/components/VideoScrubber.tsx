import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** Fires on drag start/end so the player can pause and resume. */
  onScrubbingChange?: (scrubbing: boolean) => void;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function VideoScrubber({ currentTime, duration, onSeek, onScrubbingChange }: Props) {
  const [width, setWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const widthRef = useRef(0);
  const durationRef = useRef(0);
  const startRatio = useRef(0);
  durationRef.current = duration;

  const ratio =
    dragRatio ?? (duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0);

  const seekTo = (r: number) => {
    const clamped = Math.min(Math.max(r, 0), 1);
    setDragRatio(clamped);
    if (durationRef.current > 0) onSeek(clamped * durationRef.current);
  };

  const pan = useRef(
    PanResponder.create({
      // Capture-phase claims beat the parent ScrollView, which would
      // otherwise swallow the horizontal drag.
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        onScrubbingChange?.(true);
        const w = widthRef.current || 1;
        const r = evt.nativeEvent.locationX / w;
        startRatio.current = r;
        seekTo(r);
      },
      onPanResponderMove: (_evt, gesture) => {
        const w = widthRef.current || 1;
        seekTo(startRatio.current + gesture.dx / w);
      },
      onPanResponderRelease: () => {
        onScrubbingChange?.(false);
        setDragRatio(null);
      },
      onPanResponderTerminate: () => {
        onScrubbingChange?.(false);
        setDragRatio(null);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const scrubbing = dragRatio !== null;
  const shown = scrubbing && duration > 0 ? dragRatio! * duration : currentTime;

  return (
    <View style={styles.wrap}>
      <Text style={styles.time}>{fmt(shown)}</Text>
      <View style={styles.trackArea} onLayout={onLayout} {...pan.panHandlers}>
        {/* Both are pointerEvents="none" so the touch target is always
            trackArea. Otherwise locationX on grant comes back relative to
            whichever child was hit — grabbing the thumb measured against the
            thumb's own 14px box and jumped playback to the start. */}
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: ratio * width }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            scrubbing && styles.thumbActive,
            { left: Math.max(0, ratio * width - (scrubbing ? 10 : 7)) },
          ]}
        />
      </View>
      <Text style={styles.time}>{fmt(duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 4,
  },
  time: {
    color: '#fff',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 30,
    textAlign: 'center',
  },
  // tall touch target around a thin visual track (easy to grab)
  trackArea: { flex: 1, height: 34, justifyContent: 'center' },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.accent },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
