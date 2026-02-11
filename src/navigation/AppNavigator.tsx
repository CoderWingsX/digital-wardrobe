// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';

import HomeScreen from '../screens/HomeScreen/index';
import WardrobeScreen from '../screens/WardrobeScreen/index';
import SettingsScreen from '../screens/SettingsScreen/index';
import ItemDetailsScreen from '../screens/ItemDetailsScreen/index';
import AddItemScreen from '../screens/AddItemScreen/index';

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
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home' }}
        />
        <Stack.Screen
          name="WardrobeView"
          component={WardrobeScreen}
          options={{ title: 'Wardrobe' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="AddItem"
          component={AddItemScreen}
          options={({ route }) => ({
            title: route.params?.item ? 'Edit Item' : 'Add Item',
          })}
        />
        <Stack.Screen
          name="ItemDetails"
          component={ItemDetailsScreen}
          options={{ title: 'Item Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
