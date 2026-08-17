import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MuscleRef } from '../data/activities';
import { bodySvg, mainMuscleSvg, secondaryMuscleSvg } from '../data/generated/bodyMapSvgs';

// All wger muscle SVGs share a 200x369 canvas, so highlight layers
// stack directly over the body silhouette. The SVGs are bundled
// (see scripts/fetch-bodymap-svgs.mjs) because wger serves them
// without CORS headers — fetching at runtime fails on web.
const Layer = React.memo(function Layer({ xml }: { xml: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});

interface Props {
  muscles: MuscleRef[];
  secondaryMuscles?: MuscleRef[];
}

// Memoized: SvgXml re-parses its XML string on every render, and the drill
// screen re-renders while a clip plays.
export default React.memo(function BodyMap({ muscles, secondaryMuscles = [] }: Props) {
  const sides = [
    { key: 'front' as const, front: true },
    { key: 'back' as const, front: false },
  ];
  return (
    <View style={styles.row}>
      {sides.map((side) => (
        <View key={side.key} style={styles.map}>
          <SvgXml xml={bodySvg[side.key]} width="100%" height="100%" />
          {muscles
            .filter((m) => m.front === side.front && mainMuscleSvg[m.id])
            .map((m) => (
              <Layer key={`p-${m.id}`} xml={mainMuscleSvg[m.id]} />
            ))}
          {secondaryMuscles
            .filter((m) => m.front === side.front && secondaryMuscleSvg[m.id])
            .map((m) => (
              <Layer key={`s-${m.id}`} xml={secondaryMuscleSvg[m.id]} />
            ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#ece7dc',
    borderRadius: 12,
    paddingVertical: 10,
  },
  map: {
    flex: 1,
    maxWidth: 150,
    aspectRatio: 200 / 369,
  },
});
