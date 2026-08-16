import React from 'react';
import { Text, TextStyle } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import DrillListScreen from './src/screens/DrillListScreen';
import DrillDetailScreen from './src/screens/DrillDetailScreen';
import CreditsScreen from './src/screens/CreditsScreen';
import { RootStackParamList } from './src/navigation';
import { loadSport, sportIndex } from './src/data/activities';
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
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'DojoFit',
            headerRight: () => (
              <Text style={headerLink} onPress={() => navigation.navigate('Credits')}>
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
