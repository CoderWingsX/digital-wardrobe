// src/navigation/AppNavigator.tsx

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, TransitionPresets } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ItemDetailsScreen from '../screens/ItemDetailsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isDark, colors } = useTheme();

  const navigationTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.headerBackground,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.headerBackground,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          ...TransitionPresets.SlideFromRightIOS,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 200 } },
            close: { animation: 'timing', config: { duration: 200 } },
          },
          cardStyle: { backgroundColor: colors.background },
          cardOverlayEnabled: true,
          detachPreviousScreen: false,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'Wardrobe',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={{ padding: 8 }}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 22 }}>⚙️</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="ItemDetails"
          component={ItemDetailsScreen}
          options={{ title: 'Item Details' }}
        />
        <Stack.Screen
          name="AddItem"
          component={AddItemScreen}
          options={{ title: 'Add Item' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
