import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import DrillListScreen from './src/screens/DrillListScreen';
import DrillDetailScreen from './src/screens/DrillDetailScreen';
import { RootStackParamList } from './src/navigation';
import { loadSport, sportIndex } from './src/data/activities';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'DojoFit' }} />
        <Stack.Screen
          name="DrillList"
          component={DrillListScreen}
          options={({ route }) => ({
            title: sportIndex.find((s) => s.id === route.params.activityId)?.name ?? 'Drills',
          })}
        />
        <Stack.Screen
          name="DrillDetail"
          component={DrillDetailScreen}
          options={({ route }) => {
            const activity = loadSport(route.params.activityId);
            const drill = activity?.drills.find((d) => d.id === route.params.drillId);
            return { title: drill?.name ?? 'Drill' };
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
