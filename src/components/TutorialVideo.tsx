import React, { useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { track } from '../data/analytics';
import { t } from '../i18n';
import { colors } from '../theme';

interface Props {
  videoId: string;
  title?: string;
  channel?: string;
  /** Fallback link used when the embed can't load. */
  searchUrl?: string;
}

// YouTube's official embed player: no API key at runtime, and it satisfies
// YouTube's terms (which don't allow extracting the raw video stream).
// The thumbnail is shown until the user taps, so opening a drill doesn't
// pull a player frame for every technique.
export default function TutorialVideo({ videoId, title, channel, searchUrl }: Props) {
  const [playing, setPlaying] = useState(false);

  const embedUrl =
    `https://www.youtube.com/embed/${videoId}` +
    '?autoplay=1&playsinline=1&rel=0&modestbranding=1';

  const start = () => {
    track('video_play', 'tutorial');
    setPlaying(true);
  };

  return (
    <View>
      <View style={styles.frame}>
        {playing ? (
          Platform.OS === 'web' ? (
            // react-native-webview has no web implementation; the DOM
            // iframe is the equivalent there.
            React.createElement('iframe' as never, {
              src: embedUrl,
              style: { border: 0, width: '100%', height: '100%' },
              allow: 'autoplay; encrypted-media; picture-in-picture',
              allowFullScreen: true,
            })
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={styles.fill}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          )
        ) : (
          <Pressable style={styles.fill} onPress={start}>
            <Image
              source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }}
              style={styles.thumb}
            />
            <View style={styles.center}>
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? t('findTutorials')}
          {channel ? <Text style={styles.channel}> · {channel}</Text> : null}
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL(searchUrl ?? `https://www.youtube.com/watch?v=${videoId}`)
          }
        >
          <Text style={styles.link}>YouTube ↗</Text>
        </Pressable>
      </View>
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
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  thumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover' as const,
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
  },
  playIcon: { color: '#fff', fontSize: 24, marginLeft: 5 },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { flex: 1, fontSize: 12, color: colors.secondary },
  channel: { color: colors.muted },
  link: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
});
