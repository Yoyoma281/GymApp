import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { MuscleRef } from '../data/activities';

const BASE = 'https://wger.de/static/images/muscles';

// All wger muscle SVGs share a 200x369 canvas, so highlight layers
// stack directly over the body silhouette.
function Layer({ uri }: { uri: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SvgUri uri={uri} width="100%" height="100%" />
    </View>
  );
}

interface Props {
  muscles: MuscleRef[];
  secondaryMuscles?: MuscleRef[];
}

export default function BodyMap({ muscles, secondaryMuscles = [] }: Props) {
  const sides = [
    { key: 'front', base: `${BASE}/muscular_system_front.svg`, front: true },
    { key: 'back', base: `${BASE}/muscular_system_back.svg`, front: false },
  ];
  return (
    <View style={styles.row}>
      {sides.map((side) => (
        <View key={side.key} style={styles.map}>
          <SvgUri uri={side.base} width="100%" height="100%" />
          {muscles
            .filter((m) => m.front === side.front)
            .map((m) => (
              <Layer key={`p-${m.id}`} uri={`${BASE}/main/muscle-${m.id}.svg`} />
            ))}
          {secondaryMuscles
            .filter((m) => m.front === side.front)
            .map((m) => (
              <Layer key={`s-${m.id}`} uri={`${BASE}/secondary/muscle-${m.id}.svg`} />
            ))}
        </View>
      ))}
    </View>
  );
}

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
    width: 110,
    aspectRatio: 200 / 369,
  },
});
