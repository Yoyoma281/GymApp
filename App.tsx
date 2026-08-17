import React, { useEffect } from 'react';
import { AppState, Text, TextStyle } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import DrillListScreen from './src/screens/DrillListScreen';
import DrillDetailScreen from './src/screens/DrillDetailScreen';
import CreditsScreen from './src/screens/CreditsScreen';
import { RootStackParamList } from './src/navigation';
import { loadSport, sportIndex } from './src/data/activities';
import { flush, initAnalytics, track } from './src/data/analytics';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerLink: TextStyle = { color: colors.accent, fontSize: 14, fontWeight: '600' };

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
  useEffect(() => {
    void initAnalytics();
    // Send anything still queued when the app goes to the background.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flush();
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          // Android's default push is an abrupt vertical fade; a horizontal
          // slide matches the drill-down and makes back feel like an undo.
          animation: 'slide_from_right',
          animationDuration: 260,
          gestureEnabled: true,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'DojoFit',
            headerRight: () => (
              <Text
                style={headerLink}
                onPress={() => {
                  track('credits_open');
                  navigation.navigate('Credits');
                }}
              >
                Credits
              </Text>
            ),
          })}
        />
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
        <Stack.Screen
          name="Credits"
          component={CreditsScreen}
          options={{ title: 'Credits & licenses' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
